-- /!\ Only works with MariaDB /!\
ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS selected bit not null default 0;