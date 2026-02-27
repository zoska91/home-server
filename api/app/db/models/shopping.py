from app.db.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship


class ShoppingProduct(Base):
    __tablename__ = "shopping_products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)


class ShoppingListItem(Base):
    __tablename__ = "shopping_list"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("shopping_products.id"), nullable=False)
    product = relationship("ShoppingProduct")
