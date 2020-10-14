# GATE-SERVICE

#### Clone the repository

```bash
git clone https://github.com/communcom/gate.git
cd gate
```

#### Create .env file

```bash
cp .env.example .env
```

Add variables
```bash
GLS_FACADE_CONNECT=http://facade-node:3000
GLS_AUTH_CONNECT=http://auth-node:3000
```

#### Create docker-compose file

```bash
cp docker-compose.example.yml docker-compose.yml 
```

#### Run

```bash
docker-compose up -d --build
```
