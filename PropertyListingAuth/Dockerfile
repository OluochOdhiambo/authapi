FROM node:14.19-alpine

ENV MONGO_DB_USERNAME=mtayetuadmin \
    MONGO_DB_PWD=extractorGuru93

RUN mkdir -p /home/app

COPY ./app /home/app

CMD ["node", "/home/app/index.js"]