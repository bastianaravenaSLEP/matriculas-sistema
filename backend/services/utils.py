# services/utils.py

def determinar_nivel_backend(curso_str: str, cod_tipo: int) -> str:
    texto = str(curso_str).lower() if curso_str else ""
    
    # 1. PARVULARIA: Prioridad absoluta para palabras clave de educación inicial
    palabras_parvularia = ['kinder', 'kínder', 'parvularia', 'sala cuna', 'nivel medio', 'heterogéneo', 'heterogeneo', 'transición']
    if any(palabra in texto for palabra in palabras_parvularia) or cod_tipo == 10: 
        return 'Educación Parvularia'
    
    # 2. BÁSICA
    if 'básico' in texto or 'basico' in texto or (cod_tipo and 110 <= cod_tipo <= 119): 
        return 'Educación Básica'
    
    # 3. MEDIA: (Solo caerá aquí si no es "Nivel Medio" de parvularia)
    if 'medio' in texto or 'media' in texto or (cod_tipo and cod_tipo >= 300): 
        return 'Educación Media'
    
    return 'Educación Básica'