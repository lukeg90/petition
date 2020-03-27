DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles(
    id SERIAL PRIMARY KEY,
    age INTEGER,
    city VARCHAR(255),
    url TEXT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id)
);