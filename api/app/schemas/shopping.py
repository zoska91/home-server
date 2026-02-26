from pydantic import BaseModel
from typing import Optional

# Shopping Products
class ShoppingProductCreate(BaseModel):
    name: str

class ShoppingProductResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

# Shopping List
class ShoppingListItemCreate(BaseModel):
    product_id: int

class ShoppingListItemResponse(BaseModel):
    id: int
    product: ShoppingProductResponse

    class Config:
        from_attributes = True