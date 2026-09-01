-- Local DB schema reference (kafi_dev)
-- Generated: 2026-09-01T11:20:51.633Z

-- analytics_events
  id char(26) NOT NULL 
  event_name varchar(50) NOT NULL 
  event_type enum('custom','conversion') NOT NULL 
  anonymous_visitor_id varchar(36) NULL 
  page_path varchar(500) NULL 
  referrer varchar(500) NULL 
  utm_source varchar(150) NULL 
  utm_medium varchar(150) NULL 
  utm_campaign varchar(150) NULL 
  utm_content varchar(150) NULL 
  utm_term varchar(150) NULL 
  payload longtext NULL 
  inquiry_id varchar(26) NULL 
  created_at datetime NOT NULL 

-- auth_audit_logs
  id char(26) NOT NULL 
  user_id char(26) NULL 
  event_type varchar(50) NOT NULL 
  ip_address varchar(45) NULL 
  user_agent varchar(255) NULL 
  success tinyint(1) NOT NULL 
  details text NULL 
  created_at datetime NOT NULL 

-- cities
  id char(26) NOT NULL 
  country_id char(26) NOT NULL 
  region_id char(26) NULL 
  geoname_id int(11) NOT NULL 
  name varchar(150) NOT NULL 
  latitude decimal(10,7) NULL 
  longitude decimal(10,7) NULL 
  population int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- contact_persons
  id char(26) NOT NULL 
  first_name varchar(100) NOT NULL 
  middle_name varchar(100) NULL 
  last_name varchar(100) NOT NULL 
  gender enum('Female','Male') NULL 
  date_of_birth date NULL 
  phone_number varchar(30) NOT NULL 
  alternate_phone_number varchar(30) NULL 
  email_address varchar(255) NULL 
  address text NULL 
  country_id char(26) NULL 
  region_id char(26) NULL 
  preferred_language_id char(26) NULL 
  contact_person_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- contact_person_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- countries
  id char(26) NOT NULL 
  iso_code varchar(10) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- credit_exception_requests
  id char(26) NOT NULL 
  request_number varchar(30) NOT NULL 
  registration_id char(26) NOT NULL 
  requested_amount decimal(18,2) NOT NULL 
  reason text NOT NULL 
  requested_due_date datetime NULL 
  requested_by char(26) NOT NULL 
  credit_exception_request_status_id char(26) NOT NULL 
  active_request_lock char(26) NULL 
  reviewed_by char(26) NULL 
  reviewed_at datetime NULL 
  rejection_reason text NULL 
  finance_exception_id char(26) NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 

-- credit_exception_request_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- currencies
  id char(26) NOT NULL 
  currency_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  symbol varchar(10) NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- documents
  id char(26) NOT NULL 
  document_number varchar(30) NOT NULL 
  traveller_id char(26) NULL 
  registration_id char(26) NULL 
  document_type_id char(26) NOT NULL 
  original_filename varchar(255) NULL 
  stored_filename varchar(255) NULL 
  mime_type varchar(100) NULL 
  file_size bigint(20) NOT NULL 
  storage_path text NULL 
  verification_status_id char(26) NOT NULL 
  verified_by char(26) NULL 
  verified_at datetime NULL 
  expiry_date date NULL 
  document_status_id char(26) NOT NULL 
  remarks text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  display_name varchar(255) NULL 

-- document_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- document_types
  id char(26) NOT NULL 
  type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- email_verification_tokens
  id char(26) NOT NULL 
  user_id char(26) NOT NULL 
  token_hash varchar(64) NOT NULL 
  expires_at datetime NOT NULL 
  created_at datetime NOT NULL 

-- expenses
  id char(26) NOT NULL 
  expense_number varchar(30) NOT NULL 
  expense_category_id char(26) NOT NULL 
  expense_source_id char(26) NOT NULL 
  expense_status_id char(26) NOT NULL 
  amount decimal(18,2) NOT NULL 
  original_amount decimal(18,2) NULL 
  original_currency_id char(26) NULL 
  exchange_rate decimal(18,6) NULL 
  expense_date datetime NOT NULL 
  description varchar(255) NULL 
  notes text NULL 
  vendor_id char(26) NULL 
  payee_name varchar(255) NULL 
  attribution_scope enum('TRAVELER','GROUP','GENERAL') NOT NULL 
  traveller_id char(26) NULL 
  registration_id char(26) NULL 
  travel_group_id char(26) NULL 
  package_version_id char(26) NULL 
  source_visa_application_id char(26) NULL 
  source_flight_booking_id char(26) NULL 
  source_group_hotel_stay_id char(26) NULL 
  source_transport_segment_id char(26) NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- expense_adjustments
  id char(26) NOT NULL 
  adjustment_number varchar(30) NOT NULL 
  expense_id char(26) NOT NULL 
  adjustment_type enum('SUPPLIER_REFUND','CANCELLATION_FEE','OTHER_ADJUSTMENT') NOT NULL 
  amount decimal(18,2) NOT NULL 
  adjustment_date datetime NOT NULL 
  description varchar(255) NULL 
  reason text NOT NULL 
  source_record_type enum('FLIGHT_BOOKING','GROUP_HOTEL_STAY','TRANSPORT_SEGMENT','VISA_APPLICATION','REGISTRATION') NOT NULL 
  source_record_id char(26) NOT NULL 
  source_record_number varchar(30) NULL 
  traveller_id char(26) NULL 
  registration_id char(26) NULL 
  travel_group_id char(26) NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- expense_allocations
  id char(26) NOT NULL 
  expense_id char(26) NOT NULL 
  traveller_id char(26) NOT NULL 
  registration_id char(26) NULL 
  allocated_amount decimal(18,2) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- expense_categories
  id char(26) NOT NULL 
  category_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- expense_sources
  id char(26) NOT NULL 
  source_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- expense_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- finance_exceptions
  id char(26) NOT NULL 
  exception_number varchar(30) NOT NULL 
  registration_id char(26) NOT NULL 
  authorized_amount decimal(18,2) NOT NULL 
  reason text NOT NULL 
  approved_by char(26) NOT NULL 
  approved_at datetime NOT NULL 
  due_date datetime NULL 
  finance_exception_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  active_lock char(26) NULL 

-- finance_exception_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- flight_bookings
  id char(26) NOT NULL 
  booking_number varchar(30) NOT NULL 
  registration_id char(26) NOT NULL 
  flight_booking_status_id char(26) NOT NULL 
  pnr varchar(50) NOT NULL 
  departure_flight_number varchar(50) NOT NULL 
  departure_date date NOT NULL 
  return_flight_number varchar(50) NULL 
  return_date date NULL 
  cancellation_date date NULL 
  cancellation_reason text NULL 
  notes text NULL 
  created_at timestamp NOT NULL 
  updated_at timestamp NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at timestamp NULL 
  supplier_cost decimal(18,2) NULL 
  cancellation_fee decimal(18,2) NULL 

-- flight_booking_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active int(11) NOT NULL 
  created_at timestamp NOT NULL 
  updated_at timestamp NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at timestamp NULL 

-- group_hotel_stays
  id char(26) NOT NULL 
  stay_number varchar(30) NOT NULL 
  travel_group_id char(26) NOT NULL 
  hotel_id char(26) NULL 
  hotel_name varchar(255) NULL 
  booking_reference varchar(120) NULL 
  sequence_order int(11) NOT NULL 
  city_id char(26) NOT NULL 
  check_in_date date NOT NULL 
  check_out_date date NOT NULL 
  group_hotel_stay_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  accommodation_cost decimal(18,2) NULL 

-- group_hotel_stay_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- group_memberships
  id char(26) NOT NULL 
  travel_group_id char(26) NOT NULL 
  registration_id char(26) NOT NULL 
  group_membership_status_id char(26) NOT NULL 
  joined_at datetime NOT NULL 
  left_at datetime NULL 
  transferred_from_group_membership_id char(26) NULL 
  guarantee_required tinyint(1) NOT NULL 
  guarantee_waived tinyint(1) NOT NULL 
  guarantee_waived_by char(26) NULL 
  guarantee_waived_at datetime NULL 
  remarks text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- group_membership_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- guarantees
  id char(26) NOT NULL 
  guarantee_number varchar(30) NOT NULL 
  group_membership_id char(26) NULL 
  registration_id char(26) NOT NULL 
  guarantee_type enum('PERSON','CASH_DEPOSIT','CPO','BANK_GUARANTEE','OTHER') NOT NULL 
  guarantee_status enum('PENDING','ACTIVE','REPLACED','RELEASED','REFUNDED','EXPIRED') NOT NULL 
  contact_person_id char(26) NULL 
  instrument_reference varchar(120) NULL 
  amount decimal(18,2) NULL 
  currency_id char(26) NULL 
  effective_date date NULL 
  expiry_date date NULL 
  issuer varchar(120) NULL 
  previous_guarantee_id char(26) NULL 
  replaced_by_id char(26) NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- hotels
  id char(26) NOT NULL 
  hotel_code varchar(30) NOT NULL 
  name varchar(150) NOT NULL 
  address text NULL 
  city varchar(100) NULL 
  country varchar(100) NULL 
  phone_number varchar(30) NULL 
  email_address varchar(255) NULL 
  hotel_type_id char(26) NULL 
  hotel_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- hotel_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- hotel_types
  id char(26) NOT NULL 
  type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- inquiries
  id char(26) NOT NULL 
  inquiry_number varchar(30) NOT NULL 
  inquiry_type enum('BOOKING','CALLBACK','CONTACT','ENQUIRY') NOT NULL 
  inquiry_status enum('NEW','CONTACTED','RESOLVED') NOT NULL 
  full_name varchar(150) NULL 
  phone_number varchar(30) NOT NULL 
  email_address varchar(255) NULL 
  message text NULL 
  enquiry_category varchar(50) NULL 
  package_interest varchar(150) NULL 
  service_interest varchar(150) NULL 
  travel_period varchar(50) NULL 
  group_size varchar(20) NULL 
  source_channel varchar(50) NULL 
  user_agent varchar(255) NULL 
  staff_notes text NULL 
  handled_by char(26) NULL 
  contacted_at datetime NULL 
  resolved_at datetime NULL 
  first_viewed_at datetime NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  utm_source varchar(150) NULL 
  utm_medium varchar(150) NULL 
  utm_campaign varchar(150) NULL 
  utm_content varchar(150) NULL 
  utm_term varchar(150) NULL 
  anonymous_visitor_id varchar(36) NULL 

-- invoices
  id char(26) NOT NULL 
  invoice_number varchar(30) NOT NULL 
  registration_id char(26) NOT NULL 
  invoice_date datetime NOT NULL 
  due_date datetime NULL 
  subtotal decimal(18,2) NOT NULL 
  discount_amount decimal(18,2) NOT NULL 
  total_amount decimal(18,2) NOT NULL 
  currency_id char(26) NOT NULL 
  invoice_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- invoice_line_items
  id char(26) NOT NULL 
  invoice_id char(26) NOT NULL 
  line_item_type_id char(26) NULL 
  description varchar(255) NOT NULL 
  quantity decimal(18,2) NOT NULL 
  unit_price decimal(18,2) NOT NULL 
  total_price decimal(18,2) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- invoice_line_item_types
  id char(26) NOT NULL 
  line_item_type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- invoice_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- languages
  id char(26) NOT NULL 
  language_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_categories
  id char(26) NOT NULL 
  category_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_templates
  id char(26) NOT NULL 
  package_template_code varchar(30) NOT NULL 
  name varchar(150) NOT NULL 
  short_name varchar(50) NULL 
  description text NULL 
  pilgrimage_type_id char(26) NOT NULL 
  package_category_id char(26) NOT NULL 
  default_duration_days int(11) NOT NULL 
  package_template_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_template_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_versions
  id char(26) NOT NULL 
  package_version_code varchar(30) NOT NULL 
  package_template_id char(26) NOT NULL 
  version_name varchar(150) NOT NULL 
  version_number int(11) NOT NULL 
  slug varchar(200) NOT NULL 
  hero_image_url varchar(500) NULL 
  sort_order int(11) NOT NULL 
  season_id char(26) NULL 
  year int(11) NOT NULL 
  departure_date date NULL 
  return_date date NULL 
  base_price decimal(18,2) NOT NULL 
  currency_id char(26) NOT NULL 
  max_capacity int(11) NULL 
  published_at datetime NULL 
  sales_start_date date NULL 
  sales_end_date date NULL 
  package_version_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_version_inclusions
  id char(26) NOT NULL 
  package_version_id char(26) NOT NULL 
  inclusion_text varchar(255) NOT NULL 
  display_order int(11) NOT NULL 
  is_highlighted tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- package_version_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- password_reset_tokens
  id char(26) NOT NULL 
  user_id char(26) NOT NULL 
  token_hash varchar(64) NOT NULL 
  expires_at datetime NOT NULL 
  used_at datetime NULL 
  created_at datetime NOT NULL 

-- payers
  id char(26) NOT NULL 
  payer_number varchar(30) NOT NULL 
  payer_type_id char(26) NOT NULL 
  traveller_id char(26) NULL 
  contact_person_id char(26) NULL 
  organization_name varchar(255) NULL 
  contact_name varchar(255) NULL 
  phone_number varchar(30) NULL 
  email_address varchar(255) NULL 
  payer_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payer_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payer_types
  id char(26) NOT NULL 
  type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payments
  id char(26) NOT NULL 
  payment_number varchar(30) NOT NULL 
  payer_id char(26) NOT NULL 
  payment_method_id char(26) NOT NULL 
  payment_date datetime NOT NULL 
  original_amount decimal(18,2) NOT NULL 
  original_currency_id char(26) NOT NULL 
  exchange_rate decimal(18,6) NOT NULL 
  amount decimal(18,2) NOT NULL 
  reference_number varchar(100) NULL 
  received_by char(26) NOT NULL 
  payment_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payment_allocations
  id char(26) NOT NULL 
  payment_id char(26) NOT NULL 
  invoice_id char(26) NOT NULL 
  allocated_amount decimal(18,2) NOT NULL 
  allocation_date datetime NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payment_methods
  id char(26) NOT NULL 
  method_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  payment_method_status_id char(26) NOT NULL 
  display_order int(11) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payment_method_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- payment_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- permissions
  id char(26) NOT NULL 
  permission_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  module varchar(100) NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- pilgrimage_types
  id char(26) NOT NULL 
  pilgrimage_type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- refresh_token_blocklist
  id char(26) NOT NULL 
  token_hash varchar(64) NOT NULL 
  user_id char(26) NOT NULL 
  expires_at datetime NOT NULL 
  created_at datetime NOT NULL 

-- refunds
  id char(26) NOT NULL 
  refund_number varchar(30) NOT NULL 
  payment_id char(26) NOT NULL 
  payer_id char(26) NOT NULL 
  amount decimal(18,2) NOT NULL 
  reason text NOT NULL 
  refund_date datetime NOT NULL 
  approved_by char(26) NOT NULL 
  approved_at datetime NOT NULL 
  refund_status_id char(26) NOT NULL 
  registration_id char(26) NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- refund_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- regions
  id char(26) NOT NULL 
  country_id char(26) NOT NULL 
  region_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- registrations
  id char(26) NOT NULL 
  registration_number varchar(30) NOT NULL 
  traveller_id char(26) NOT NULL 
  package_version_id char(26) NOT NULL 
  registration_date datetime NOT NULL 
  expected_departure_date date NULL 
  expected_return_date date NULL 
  registration_status_id char(26) NOT NULL 
  cancellation_reason text NULL 
  cancelled_at datetime NULL 
  cancelled_by char(26) NULL 
  remarks text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- registration_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- relationship_types
  id char(26) NOT NULL 
  relationship_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- roles
  id char(26) NOT NULL 
  role_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_system_role tinyint(1) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- role_permissions
  id char(26) NOT NULL 
  role_id char(26) NOT NULL 
  permission_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- rooms
  id char(26) NOT NULL 
  room_code varchar(30) NULL 
  group_hotel_stay_id char(26) NOT NULL 
  room_number varchar(50) NOT NULL 
  capacity int(11) NOT NULL 
  gender_restriction enum('Female','Male') NULL 
  room_type_id char(26) NULL 
  room_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- room_assignments
  id char(26) NOT NULL 
  room_id char(26) NOT NULL 
  group_hotel_stay_id char(26) NOT NULL 
  group_membership_id char(26) NOT NULL 
  assigned_at datetime NOT NULL 
  released_at datetime NULL 
  bed_number varchar(20) NULL 
  room_assignment_status_id char(26) NOT NULL 
  is_active_assignment tinyint(1) NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  active_membership_stay_key varchar(79) NULL 

-- room_assignment_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- room_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- room_types
  id char(26) NOT NULL 
  type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- seasons
  id char(26) NOT NULL 
  season_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- transport_segments
  id char(26) NOT NULL 
  transport_segment_number varchar(30) NOT NULL 
  travel_group_id char(26) NOT NULL 
  vendor_id char(26) NULL 
  transport_type enum('BUS','COASTER','VAN','SEDAN','SUV','OTHER') NULL 
  segment_order int(11) NOT NULL 
  origin_location varchar(255) NOT NULL 
  destination_location varchar(255) NOT NULL 
  origin_type enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER') NULL 
  destination_type enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER') NULL 
  departure_datetime datetime NULL 
  arrival_datetime datetime NULL 
  vehicle_identifier varchar(100) NULL 
  driver_name varchar(255) NULL 
  driver_phone_number varchar(30) NULL 
  transport_segment_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  transport_cost decimal(18,2) NULL 

-- transport_segment_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- travellers
  id char(26) NOT NULL 
  traveller_number varchar(30) NOT NULL 
  first_name varchar(100) NOT NULL 
  middle_name varchar(100) NULL 
  last_name varchar(100) NOT NULL 
  gender enum('Female','Male') NOT NULL 
  date_of_birth date NULL 
  phone_number varchar(30) NOT NULL 
  email_address varchar(255) NULL 
  passport_number varchar(50) NULL 
  fayda_number varchar(50) NULL 
  country_id char(26) NOT NULL 
  region_id char(26) NULL 
  preferred_language_id char(26) NULL 
  traveller_source_id char(26) NULL 
  traveller_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- traveller_contacts
  id char(26) NOT NULL 
  traveller_id char(26) NOT NULL 
  contact_person_id char(26) NOT NULL 
  relationship_type_id char(26) NOT NULL 
  is_emergency_contact tinyint(1) NOT NULL 
  is_primary_contact tinyint(1) NOT NULL 
  priority int(11) NOT NULL 
  notes text NULL 
  traveller_contact_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- traveller_contact_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- traveller_sources
  id char(26) NOT NULL 
  source_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- traveller_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- travel_groups
  id char(26) NOT NULL 
  group_number varchar(30) NOT NULL 
  package_version_id char(26) NOT NULL 
  name varchar(150) NOT NULL 
  departure_date date NULL 
  return_date date NULL 
  maximum_capacity int(11) NOT NULL 
  travel_group_status_id char(26) NOT NULL 
  remarks text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- travel_group_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- users
  id char(26) NOT NULL 
  employee_number varchar(30) NOT NULL 
  full_name varchar(255) NOT NULL 
  first_name varchar(100) NOT NULL 
  middle_name varchar(100) NULL 
  last_name varchar(100) NULL 
  gender varchar(10) NOT NULL 
  email_address varchar(255) NOT NULL 
  phone_number varchar(30) NOT NULL 
  password_hash text NOT NULL 
  job_title varchar(100) NULL 
  last_login_at datetime NULL 
  password_changed_at datetime NULL 
  must_change_password tinyint(1) NOT NULL 
  is_email_verified tinyint(1) NOT NULL 
  is_phone_verified tinyint(1) NOT NULL 
  failed_login_attempts int(11) NOT NULL 
  locked_until datetime NULL 
  user_status_id char(26) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- user_roles
  id char(26) NOT NULL 
  user_id char(26) NOT NULL 
  role_id char(26) NOT NULL 
  assigned_at datetime NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- user_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- vendors
  id char(26) NOT NULL 
  vendor_number varchar(30) NOT NULL 
  name varchar(255) NOT NULL 
  vendor_type_id char(26) NOT NULL 
  contact_person_name varchar(255) NULL 
  phone_number varchar(30) NULL 
  alternate_phone_number varchar(30) NULL 
  email_address varchar(255) NULL 
  address text NULL 
  tax_identification_number varchar(100) NULL 
  license_number varchar(100) NULL 
  vendor_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- vendor_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- vendor_types
  id char(26) NOT NULL 
  type_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- verification_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 

-- visa_applications
  id char(26) NOT NULL 
  application_number varchar(30) NOT NULL 
  registration_id char(26) NOT NULL 
  submission_date date NULL 
  approval_date date NULL 
  expiry_date date NULL 
  visa_number varchar(100) NULL 
  visa_application_status_id char(26) NOT NULL 
  notes text NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  created_by char(26) NULL 
  updated_by char(26) NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 
  rejection_date date NULL 
  rejection_reason text NULL 
  cancellation_date date NULL 
  cancellation_reason text NULL 
  visa_cost decimal(18,2) NULL 

-- visa_application_statuses
  id char(26) NOT NULL 
  status_code varchar(30) NOT NULL 
  name varchar(100) NOT NULL 
  description text NULL 
  display_order int(11) NOT NULL 
  is_active tinyint(1) NOT NULL 
  created_at datetime NOT NULL 
  updated_at datetime NOT NULL 
  is_deleted tinyint(1) NOT NULL 
  deleted_at datetime NULL 


