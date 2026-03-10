-- ============================================================
-- Support tickets & messages (admin dashboard Support page)
-- Run this in the Supabase SQL Editor for your project.
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',    -- open, pending, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal',-- low, normal, high, urgent
  category TEXT,                          -- order_issue, product_question, ambassador_query, other
  assignee_profile_id UUID REFERENCES profiles(id),
  source TEXT,                            -- email, web_form, whatsapp, manual
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON support_tickets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee
  ON support_tickets(assignee_profile_id, status);

COMMENT ON TABLE support_tickets IS 'High-level record of support requests linked to users/orders.';

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,             -- customer, staff, system
  sender_profile_id UUID REFERENCES profiles(id),
  body TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON support_messages(ticket_id, created_at ASC);

COMMENT ON TABLE support_messages IS 'Conversation messages and internal notes for support tickets.';

-- Keep ticket.updated_at fresh and set closed_at when status becomes resolved/closed
CREATE OR REPLACE FUNCTION set_support_ticket_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolved', 'closed') AND OLD.status <> NEW.status AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_timestamps ON support_tickets;
CREATE TRIGGER trg_support_tickets_timestamps
BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION set_support_ticket_timestamps();

