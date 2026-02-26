from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.database import get_db
from app.db.models.shopping import ShoppingProduct, ShoppingListItem
from app.schemas.shopping import ShoppingListItemResponse, ShoppingListItemCreate, ShoppingProductResponse, ShoppingProductCreate

router = APIRouter(prefix="/shopping", tags=["shopping"])

# products
@router.get("/products", response_model=list[ShoppingProductResponse])
async def get_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShoppingProduct))
    return result.scalars().all()

@router.post("/products", response_model=ShoppingProductResponse)
async def create_product(product: ShoppingProductCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShoppingProduct).where(ShoppingProduct.name == product.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="The product is already existing")
    db_product = ShoppingProduct(name=product.name)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product

# shopping list
@router.get("/list", response_model=list[ShoppingListItemResponse])
async def get_shopping_list(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShoppingListItem))
    return result.scalars().all()

@router.post("/list", response_model=ShoppingListItemResponse)
async def add_to_list(item: ShoppingListItemCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ShoppingProduct).where(ShoppingProduct.id == item.product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="The product does not exist")
    db_item = ShoppingListItem(product_id=item.product_id)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/list")
async def clear_shopping_list(db: AsyncSession = Depends(get_db)):
    await db.execute(delete(ShoppingListItem))
    await db.commit()
    return {"message": "The shopping list has been cleared"}