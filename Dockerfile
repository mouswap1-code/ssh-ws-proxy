FROM alpine:3.19

RUN apk update && apk add \
    nodejs \
    npm \
    dropbear \
    bash \
    curl

WORKDIR /app

# Copier les fichiers
COPY package.json .
COPY proxy3.js .
COPY users.json /app/users.json
COPY run.sh .

RUN npm install && chmod +x run.sh

EXPOSE 8080

CMD ["bash", "run.sh"]
