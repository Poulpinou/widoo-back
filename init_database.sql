CREATE TABLE IF NOT EXISTS activities
(
    -- Fields
    id          bigint primary key auto_increment,
    name        varchar(64) not null,
    description varchar(255),
    repeatable  bit default false,
    done        bit default false
);