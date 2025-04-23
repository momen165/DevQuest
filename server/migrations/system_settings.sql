CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INTEGER PRIMARY KEY,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Insert the initial record if it doesn't exist
INSERT INTO system_settings (setting_id, maintenance_mode, updated_at)
VALUES (1, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (setting_id) DO NOTHING;