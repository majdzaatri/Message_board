# Message_board

- prerequisites:
  Make sure Docker and Docker Compose installed:

- Installation:
   Clone the repository

  - Running the Application
    Build and start the application containers:
    'docker-compose up'
    The application will be accessible at 'http://localhost:3000'
  
  - Using the Endpoints
    You can test the API endpoints using Postman tool or any other tool you would like, I will provide below examples with CURL command:
  
    1. /register (POST): curl -X POST -H "Content-Type: application/json" -d '{"username": "yourusername", "password": "yourpassword"}' http://localhost:3000/register
       
    2. /login (POST): curl -X POST -H "Content-Type: application/json" -d '{"username": "yourusername", "password": "yourpassword"}' http://localhost:3000/login
       
    3. /logout (POST): curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"text": "Hello, world!"}' http://localhost:3000/messages
       
    4. /messages (GET):  curl http://localhost:3000/messages
       
    5. /messages/{message_id}/vote (POST): curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"vote": "up"}' http://localhost:3000/messages/:message_id/vote
        
    6. /messages/{message_id} (DELETE): curl -X DELETE -H "Authorization: Bearer <token>" http://localhost:3000/messages/:message_id
        
    7. /user/messages (GET): curl -H "Authorization: Bearer <token>" http://localhost:3000/user/messages
  
    * Note to replace <token> with the actual token received after logging in
