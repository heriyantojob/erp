-- Create the `stock` table
CREATE TABLE stock (
  id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
  owner VARCHAR(255) NOT NULL,
  owner_transfer VARCHAR(255),
  title VARCHAR(255),
  description TEXT,
  file_type VARCHAR(20) NOT NULL,
  project_type TINYINT NOT NULL,
  status TINYINT DEFAULT 1,
  -- Status options: 0 = draft, 1 = publish, 2 = in review, 3 = reject
  slug VARCHAR(255) UNIQUE,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create the `stock_attachments` table
CREATE TABLE stock_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
  
  file_name VARCHAR(255),
  file_path VARCHAR(255),
  file_ext VARCHAR(255),
  file_mime VARCHAR(255),
  file_list JSON,
  file_size INT,
  file_width INT,
  file_height INT,

  in_preview TINYINT DEFAULT 0,
  in_download TINYINT DEFAULT 0,
  is_additional_file TINYINT DEFAULT 0,
  id_stock VARCHAR(36),  -- Foreign key reference to `stock` table
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);