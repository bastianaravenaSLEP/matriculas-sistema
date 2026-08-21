import psycopg2

DB_CONFIG = {
    "dbname": "sistema_matriculas_sleep",
    "user": "postgres",       
    "password": "admin", 
    "host": "localhost",
    "port": "5432",
    "client_encoding": "utf8"
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_client_encoding('UTF8')
        return conn
    except Exception as e:
        print("¡ALERTA!: PostgreSQL rechazó la conexión. Revisa tus credenciales.")
        raise e