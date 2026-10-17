CREATE TABLE product_statuses (
    id NUMBER CONSTRAINT product_statuses_pk PRIMARY KEY,
    code VARCHAR2(20 CHAR) CONSTRAINT product_statuses_code_nn NOT NULL,
    name VARCHAR2(50 CHAR) CONSTRAINT product_statuses_name_nn NOT NULL,
    CONSTRAINT product_statuses_code_uk UNIQUE (code)
);
