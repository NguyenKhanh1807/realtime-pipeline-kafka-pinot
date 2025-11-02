from pinotdb import connect  


conn = connect(host='93.115.172.151', port=8099, path='/query/sql', scheme='http') 
cursor = conn.cursor() 

cursor.execute("SELECT 1") 
for row in cursor:
    print(row)  
