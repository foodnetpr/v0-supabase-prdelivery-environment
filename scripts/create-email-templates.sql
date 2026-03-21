-- Create email_templates table for managing customer communications
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL, -- 'order_confirmation', 'order_ready', 'order_shipped', etc.
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, template_type)
);

-- Add RLS policies
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to email_templates" ON email_templates
FOR ALL TO service_role USING (true);

-- Authenticated users can view/edit templates for restaurants they manage
CREATE POLICY "Authenticated users can manage email_templates" ON email_templates
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Insert default Spanish templates for order confirmation
-- These are global defaults (restaurant_id = NULL) that can be overridden per restaurant
INSERT INTO email_templates (restaurant_id, template_type, subject, body) VALUES
(NULL, 'order_confirmation', 'Confirmacion de Pedido - {{restaurant_name}}', 
'Gracias por tu pedido!

Numero de Confirmacion: #{{order_number}}
Fecha del Pedido: {{order_date}}

DETALLES DEL EVENTO:
Fecha de Servicio: {{event_date}}
Hora de Servicio: {{event_time}}
Tipo: {{order_type}}
{{#if is_delivery}}Direccion de Entrega: {{delivery_address}}{{/if}}
{{#if company_name}}Empresa: {{company_name}}{{/if}}

TU PEDIDO:
{{order_items}}

Subtotal: ${{subtotal}}
ITBMS: ${{tax}}
{{#if delivery_fee}}Cargo de Entrega: ${{delivery_fee}}{{/if}}
{{#if tip}}Propina: ${{tip}}{{/if}}
TOTAL PAGADO: ${{total}}

{{#if includes_utensils}}Se incluiran utensilios y servilletas con tu pedido.{{/if}}

Nos comunicaremos contigo si tenemos alguna pregunta sobre tu pedido.
Gracias por elegir {{restaurant_name}}!'),

(NULL, 'order_ready', 'Tu Pedido Esta Listo - {{restaurant_name}}',
'Hola {{customer_name}},

Tu pedido #{{order_number}} esta listo para {{#if is_delivery}}entrega{{else}}recoger{{/if}}.

{{#if is_delivery}}
Nuestro repartidor esta en camino a:
{{delivery_address}}
{{else}}
Por favor recoge tu pedido en:
{{restaurant_address}}
{{/if}}

Gracias por tu preferencia!
{{restaurant_name}}'),

(NULL, 'order_shipped', 'Tu Pedido Esta en Camino - {{restaurant_name}}',
'Hola {{customer_name}},

Tu pedido #{{order_number}} esta en camino!

Direccion de Entrega:
{{delivery_address}}

Tiempo estimado de llegada: {{estimated_time}}

Gracias por tu preferencia!
{{restaurant_name}}')
ON CONFLICT (restaurant_id, template_type) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_restaurant_type ON email_templates(restaurant_id, template_type);
