
# INSTALLING VOTE APP ON RHEL 7.9

## INSTALL redis

```
# Download redis
sudo yum install redis -y

# Verify the server is working 
redis-server --protected-mode no 

# Run as a daemon when ready
redis-server --protected-mode no --daemonize yes
```

## INSTALL postgres

```
# Install postgres v10
sudo yum install -y postgresql-server postgresql-devel

# Init the DB
sudo /usr/bin/postgresql-setup initdb

# Enable the DB daemon
sudo systemctl enable postgresql
sudo systemctl start postgresql

# From here, I admittedly am probably doing more than needed but it works and I didn't want to waste time refining :-p
# Get config file location
sudo -u postgres psql -c 'SHOW config_file'

# Using the directory location detailed above, change the postgresql.conf file listenaddress from localhost -> *
  listen_addresses = '*' 

# Using the directory location detailed above, change the ending of the pg_hba.conf file to: 
  local   all             all                                     peer
  host    all             all              0.0.0.0/0                       trust
  host    all             all              ::/0                            trust

# Set a password for the Postgres user 
ALTER USER postgres PASSWORD 'myPassword';

# Restart postgresql (restart was finicky so suggest full stop/restart)
sudo systemctl stop postgresql
sudo systemctl start postgresql
```

## INSTALL vote (Python)

```
# Install Python3
sudo yum install python3 -y

# Install application requirements
sudo pip3 install -r requirements.txt

# Ensure the app.py file has the localhost IP set as such:
#   g.redis = Redis(host="127.0.0.1", db=0, socket_timeout=5)

# Verify it is working by running in the foreground
gunicorn app:app -b 0.0.0.0:8080 --log-file - --access-logfile - --workers 1--keep-alive 0

# Kill the existing gunicorn process
ps aux | grep gunicorn
kill -9 <ids of gunicorn processes>

# Deploy as a daemon (you may want to wait until you have Redis up before this step)
gunicorn app:app -b 0.0.0.0:8080 -D --log-file - --access-logfile - --workers 1--keep-alive 0

# Confirm the vote app is accessible on port 8080 assuming the SG is open
curl 127.0.0.1:8080
```

## INSTALL result (Node.js)

```
# Download/configure NVM (you can download the script directly to the host instead of the curl)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash

# Set NVM vars so you don't have to restart terminal
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Run this thing
. ~/.nvm/nvm.sh

# Install node v10 (using the latest node will create issues with postgres and redis)
nvm install 10

# Install dependencies
npm install

# Ensure your server.js file sets its connection string like this:
  connectionString: 'postgres://postgres:postgres@127.0.0.1/postgres'

# Verify it is working by running in the foreground
node server.js

# Install forever from NPM to allow daemonizing
npm install forever -g

# Start it up as a daemon (you may want to wait until you have postgresdb running before this step)
forever start server.js
```

## INSTALL worker (Containerized .NET Core)

```
# Remove old versions of Docker
sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine

# Install latest Docker (Note that a simple yum install is not enough, the version is too old to build the container)
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io
sudo systemctl start docker

# From the root of the worker project, ensure the Program.cs file located at src/Worker/Program.cs uses the following connections below.
# Note, to use 'Host' instead of 'Server' for Postgres, I am sure this could work for localhost but I struggled with .NET core.  
# Also, you need to do this TWICE in the file for each connection, sorry I didn't want to change their code and add more risk.
  var pgsql = OpenDbConnection("Host=<private IP>;Username=postgres;Password=postgres;");
  var redisConn = OpenRedisConnection("<private IP>");

# Build the docker image (if you get a build error at step 1, be sure you followed the above steps.  
# RHEL 7.9 had a default docker version and the latest from yum was not new enough to build this container.)
docker build -t worker .

# Confirm everything is running fine in the foreground
docker run worker 

# Start the worker as a daemon
docker run -d worker
```

## DIRECTLY DRIVE TRAFFIC FROM TERMINAL 
```
# Traffic driving to the vote app
curl -d "vote=b" -X POST 127.0.0.1:8080/

# Traffic driving to the results app
curl 127.0.0.1:4000/
```

# INSTALL loadgen (Node.js)
```
# Assumes you already have installed result above to configure node
npm install

# Verify loadgen is working in foreground
node loadgen.js

# Start loadgen as daemon in background
forever start loadgen.js
```
