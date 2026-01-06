from typing import Optional
from pydantic import BaseModel

class ClubVerify(BaseModel):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

class RecoverRequest(BaseModel):
    email: str

class RecoverConfirm(BaseModel):
    email: str
    code: str
    new_password: str