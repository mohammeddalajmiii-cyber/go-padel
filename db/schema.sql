-- Go Padel database schema (PostgreSQL / Neon)
-- Safe to run more than once: it only creates what is missing.

-- One row of venue settings, editable from the admin panel.
CREATE TABLE IF NOT EXISTS settings (
  id                 INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_minute        INT  NOT NULL DEFAULT 900,   -- 15:00 (minutes after midnight)
  close_minute       INT  NOT NULL DEFAULT 1500,  -- 01:00 next day (24*60 + 60)
  price_30           INT  NOT NULL DEFAULT 200,   -- EGP
  price_60           INT  NOT NULL DEFAULT 400,
  deposit_30         INT  NOT NULL DEFAULT 50,
  deposit_60         INT  NOT NULL DEFAULT 100,
  hold_minutes       INT  NOT NULL DEFAULT 15,    -- time to pay the deposit
  days_ahead         INT  NOT NULL DEFAULT 14,    -- how far ahead people can book
  instapay_link      TEXT NOT NULL DEFAULT '',    -- InstaPay payment link
  instapay_address   TEXT NOT NULL DEFAULT '',    -- InstaPay address (IPA), e.g. gopadel@instapay
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Every booking, walk-in and blocked slot.
-- business_date is the venue day the booking belongs to: a booking at 12:30 AM
-- on Saturday belongs to Friday's schedule. start_minute counts from midnight of
-- business_date, so 00:30 the next morning is 1470.
CREATE TABLE IF NOT EXISTS bookings (
  id                  BIGSERIAL PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,             -- private link code for the customer
  kind                TEXT NOT NULL DEFAULT 'online'
                      CHECK (kind IN ('online', 'manual', 'block')),
  status              TEXT NOT NULL
                      CHECK (status IN ('holding', 'reviewing', 'confirmed', 'paid',
                                        'rejected', 'expired', 'cancelled')),
  business_date       DATE NOT NULL,
  start_minute        INT  NOT NULL,
  duration            INT  NOT NULL CHECK (duration > 0 AND duration % 30 = 0),
  customer_name       TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  lang                TEXT NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar', 'en')),
  total_price         INT  NOT NULL DEFAULT 0,
  deposit_amount      INT  NOT NULL DEFAULT 0,
  deposit_paid        BOOLEAN NOT NULL DEFAULT false,
  remaining_method    TEXT CHECK (remaining_method IN ('cash', 'instapay')),
  remaining_paid_at   TIMESTAMPTZ,
  proof_image         BYTEA,                            -- InstaPay screenshot
  proof_mime          TEXT,
  proof_uploaded_at   TIMESTAMPTZ,
  reject_reason       TEXT,
  attendance          TEXT CHECK (attendance IN ('arrived', 'no_show')),
  note                TEXT NOT NULL DEFAULT '',
  hold_expires_at     TIMESTAMPTZ,
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_day_idx    ON bookings (business_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);

-- One row per half hour a live booking occupies. The primary key makes it
-- impossible for two bookings to hold the same half hour: no double bookings.
CREATE TABLE IF NOT EXISTS booking_slots (
  business_date  DATE   NOT NULL,
  start_minute   INT    NOT NULL,
  booking_id     BIGINT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  PRIMARY KEY (business_date, start_minute)
);
CREATE INDEX IF NOT EXISTS booking_slots_booking_idx ON booking_slots (booking_id);
