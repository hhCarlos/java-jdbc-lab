CREATE TABLE products (
    id NUMBER GENERATED ALWAYS AS IDENTITY,
    user_id NUMBER CONSTRAINT products_user_id_nn NOT NULL,
    title VARCHAR2(50 CHAR) CONSTRAINT products_title_nn NOT NULL,
    price NUMBER(12,2) CONSTRAINT products_price_nn NOT NULL,
    description CLOB,
    stock NUMBER(10,0) DEFAULT 0 CONSTRAINT products_stock_nn NOT NULL,
    CONSTRAINT products_pk PRIMARY KEY (id),
    CONSTRAINT products_user_fk FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT products_stock_nonnegative CHECK (stock >= 0)
);
CREATE INDEX products_user_id_idx ON products (user_id);
