import os

# parameters
REGION = "ap-southeast-1"
APP_NAME = "next-bedrock-app"

# get account id
ACCOUNT = os.popen("aws sts get-caller-identity | jq -r '.Account'").read().strip()

# delete all docker images
os.system("sudo docker system prune -a")

# build next-bedrock-app image
os.system(f"sudo docker build -t {APP_NAME} . ")

#  aws ecr login
os.system(f"aws ecr get-login-password --region {REGION} | sudo docker login --username AWS --password-stdin {ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com")

# get image id
IMAGE_ID=os.popen(f"sudo docker images -q {APP_NAME}:latest").read()

# tag {APP_NAME} image
os.system(f"sudo docker tag {IMAGE_ID.strip()} {ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com/{APP_NAME}:latest")

# create ecr repository
os.system(f"aws ecr create-repository --registry-id {ACCOUNT} --repository-name {APP_NAME} --region {REGION}")

# push image to ecr
os.system(f"sudo docker push {ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com/{APP_NAME}:latest")

# run locally to test
# os.system(f"sudo docker run -d -p 3000:3000 next-bedrock-app:latest")