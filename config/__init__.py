import pymysql 
# Compatibilidade com Django 6+ 
pymysql.version_info = (2, 2, 8, "final", 0) 
pymysql.install_as_MySQLdb()