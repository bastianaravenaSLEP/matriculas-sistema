import psycopg2
import queue
import threading
from contextlib import contextmanager
from config import DB_CONFIG, DB_POOL_MIN, DB_POOL_MAX, DB_POOL_TIMEOUT

class DatabaseConnectionPool:
    """
    Pool de conexiones multihilo (Thread-safe) para PostgreSQL.
    Gestiona la reutilización de conexiones mediante cola bloqueante,
    previniendo errores por saturación y verificando la salud de las conexiones.
    """
    def __init__(self, min_conn=2, max_conn=20, timeout=10.0, **conn_kwargs):
        self.min_conn = min_conn
        self.max_conn = max_conn
        self.timeout = timeout
        self.conn_kwargs = conn_kwargs
        self._pool = queue.Queue(maxsize=max_conn)
        self._total_conns = 0
        self._lock = threading.Lock()
        self._is_closed = False

        # Inicialización de conexiones mínimas
        for _ in range(self.min_conn):
            try:
                conn = self._create_connection()
                self._pool.put(conn)
            except Exception as e:
                print(f"Advertencia al pre-poblar pool de BD: {e}")

    def _create_connection(self):
        conn = psycopg2.connect(**self.conn_kwargs)
        conn.set_client_encoding(self.conn_kwargs.get("client_encoding", "UTF8"))
        with self._lock:
            self._total_conns += 1
        return conn

    def get_connection(self):
        if self._is_closed:
            raise RuntimeError("El pool de base de datos se encuentra cerrado.")

        conn = None
        try:
            conn = self._pool.get_nowait()
        except queue.Empty:
            with self._lock:
                can_create = self._total_conns < self.max_conn
            if can_create:
                try:
                    conn = self._create_connection()
                except Exception:
                    conn = self._pool.get(timeout=self.timeout)
            else:
                conn = self._pool.get(timeout=self.timeout)

        # Verificación de salud (liveness check)
        if conn.closed != 0:
            with self._lock:
                self._total_conns -= 1
            conn = self._create_connection()

        return PooledConnection(conn, self)

    def return_connection(self, raw_conn):
        if self._is_closed:
            try:
                raw_conn.close()
            except Exception:
                pass
            return

        try:
            if raw_conn.closed != 0:
                with self._lock:
                    self._total_conns -= 1
                return

            # Limpiar estado transaccional pendiente para evitar filtración entre peticiones
            try:
                raw_conn.rollback()
            except Exception:
                pass

            self._pool.put_nowait(raw_conn)
        except queue.Full:
            try:
                raw_conn.close()
            except Exception:
                pass
            with self._lock:
                self._total_conns -= 1

    def closeall(self):
        self._is_closed = True
        while not self._pool.empty():
            try:
                conn = self._pool.get_nowait()
                conn.close()
            except Exception:
                pass
        with self._lock:
            self._total_conns = 0


class PooledConnection:
    """
    Proxy de conexión para psycopg2. Al llamar a close(), devuelve la conexión al pool
    en lugar de destruir el socket TCP, garantizando retrocompatibilidad con el código existente.
    """
    def __init__(self, raw_conn, pool_ref):
        self._raw_conn = raw_conn
        self._pool = pool_ref
        self._is_closed = False

    def close(self):
        if not self._is_closed:
            self._is_closed = True
            if self._pool:
                self._pool.return_connection(self._raw_conn)

    def cursor(self, *args, **kwargs):
        if self._is_closed:
            raise RuntimeError("Intento de usar una conexión de base de datos ya cerrada.")
        return self._raw_conn.cursor(*args, **kwargs)

    def commit(self):
        if self._is_closed:
            raise RuntimeError("Intento de commit en una conexión ya cerrada.")
        return self._raw_conn.commit()

    def rollback(self):
        if self._is_closed:
            raise RuntimeError("Intento de rollback en una conexión ya cerrada.")
        return self._raw_conn.rollback()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                self.rollback()
            else:
                self.commit()
        finally:
            self.close()

    def __getattr__(self, name):
        return getattr(self._raw_conn, name)


# Instancia global del pool
_global_pool = None
_pool_lock = threading.Lock()

def get_db_pool() -> DatabaseConnectionPool:
    global _global_pool
    if _global_pool is None or _global_pool._is_closed:
        with _pool_lock:
            if _global_pool is None or _global_pool._is_closed:
                _global_pool = DatabaseConnectionPool(
                    min_conn=DB_POOL_MIN,
                    max_conn=DB_POOL_MAX,
                    timeout=DB_POOL_TIMEOUT,
                    **DB_CONFIG
                )
    return _global_pool

def get_db_connection() -> PooledConnection:
    """
    Punto de entrada compatible para todos los servicios del backend.
    Obtiene una conexión activa desde el pool.
    """
    pool = get_db_pool()
    return pool.get_connection()

def close_db_pool():
    global _global_pool
    with _pool_lock:
        if _global_pool is not None:
            _global_pool.closeall()
            _global_pool = None

@contextmanager
def get_db_cursor(commit: bool = True):
    """
    Context manager de conveniencia para ejecutar consultas:
    with get_db_cursor() as (cur, conn):
        cur.execute(...)
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        yield cur, conn
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()