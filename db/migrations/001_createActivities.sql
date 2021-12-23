CREATE TABLE IF NOT EXISTS activities
(
    -- Fields
    id           bigint primary key auto_increment,
    name         varchar(64)            not null,
    description  varchar(2048),
    repeatable   bit      default false,
    creationDate datetime default now() not null,
    endDate      datetime
);