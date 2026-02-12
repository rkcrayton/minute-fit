# Fastapi documentation

## Getting Started 
`pip install -r requirements.txt`

You will run this to install all the packages to run the api

You will also need to create a .env file for your own environment.

`touch .env`

`echo POSTGRES_USER= YOUR-USER`

`echo POSTGRES_PASSWORD=YOUR-SECURE_PASSY`

`echo POSTGRES_DB=gotta_minute_fitness`

`echo POSTGRES_PORT=5432`

`echo SECRET_KEY='Your-Secert'`

`echo SQLALCHEMY_DATABASE_URL='Your-db-url'`



These are the only two variables I use throughout my code as we add more stuff more environment variables may be needed.

Two option you have is to use docker to build the project using:

#### Option 1

`docker compose up -d --build`

then to verify if the containers are running:

`docker compose ps`

To stop services:

`docker compose down`

#### Option 2
run:

`python -m uvicorn main:app --reload` 

This will also spin up the backend but it won't be in docker

