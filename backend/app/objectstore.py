import os
import boto3
from botocore.client import Config
import asyncio
from uuid import uuid4
from typing import Optional, BinaryIO

# Env Variables
R2_ENDPOINT= os.environ.get("R2_ENDPOINT")
R2_ACCESS_KEY= os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_KEY= os.environ.get("R2_SECRET_ACCESS_KEY")
R2_REGION= os.environ.get("R2_REGION", "auto")
R2_BUCKET= os.environ.get("R2_BUCKET")

# FIXME Use logging if all the env variables are not imported properly
if not all([R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET]):
    print("Not all env variables are imported properly")

_session = boto3.Session(
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    region_name=R2_REGION,
)

s3_client = _session.client(
    "s3",
    endpoint_url=R2_ENDPOINT,
    config=Config(signature_version="s3v4"),
)

# Async Wrappers
async def upload_object(fileobj, bucket, key, content_type=None, extra_args=None):
    args={}
    if content_type:
        args["ContentType"] = content_type

    if extra_args:
        args.update(extra_args)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda:s3_client.upload_fileobj(fileobj, bucket, key, ExtraArgs=args))

async def put_object_from_bytes(data: bytes, bucket, key, content_type=None, extra_args=None):
    params = {"Bucket":bucket, "Key": key, "Body": data}
    if content_type:
        params["ContentType"] = content_type 
    if extra_args:
        params.update(extra_args)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: s3_client.put_object(**params))

async def get_object(bucket, key):
    loop = asyncio.get_running_loop()

    def _get():
        res = s3_client.get_object(Bucket=bucket, Key=key)
        data = res["Body"].read()
        metadata = {
            "ContentType": res.get("ContentType"),
            "ContentLength": res.get("ContentLength"),
            "LastModified": res.get("LastModified"),
            "ETag": res.get("ETag"),
        }
        return data, metadata
    
    data, metadata = await loop.run_in_executor(None, _get)
    return data, metadata

def generate_presigned_get_url(key:str, expires_in: int = 3600) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET, "Key":key},
        ExpiresIn=expires_in
    )

def generate_presigned_put_url(key:str, expires_in: int=3600) -> str:
    return s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": R2_BUCKET, "Key":key},
        ExpiresIn=expires_in
    )
