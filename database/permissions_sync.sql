-- Permissions
INSERT IGNORE INTO `permissions` (`id`, `permission_code`, `name`, `module`, `created_at`, `updated_at`, `is_deleted`) VALUES
  ('01KYFS8BHTKQD5A66WKBE73CDN', 'ACCOMMODATION_MANAGE', 'Manage accommodation', 'Accommodation', NOW(), NOW(), false),
  ('01KYFS8BHG9V9ADHYM8Z8JWZMY', 'AUTH_MANAGE', 'Manage authentication', 'Users & Auth', NOW(), NOW(), false),
  ('01KYT9DJNCRCCD4DBKKY4XZFPY', 'DASHBOARD_VIEW', 'View dashboard', 'General', NOW(), NOW(), false),
  ('01KYFS8BHT8W5FPGRXZ0NT4VYC', 'DOCUMENT_MANAGE', 'Manage documents', 'Documents', NOW(), NOW(), false),
  ('01KZGK9AEY4P1XT4ARXEQRRQWS', 'DOCUMENT_VIEW', 'View documents', 'Documents', NOW(), NOW(), false),
  ('01KYFS8BHQPS2MVE5MNNH6GA7K', 'FINANCE_CREATE', 'Create finance records', 'Financial', NOW(), NOW(), false),
  ('01M040ZM30WQZHAZYKNEWVGCAF', 'FINANCE_CREDIT_AUTHORIZE', 'Authorize finance credit exceptions', 'Financial', NOW(), NOW(), false),
  ('01M11EC04RJ36SAPA7FNHWNZK1', 'FINANCE_CREDIT_REQUEST', 'Request finance credit exceptions', 'Financial', NOW(), NOW(), false),
  ('01KYFS8BHSYJE0CY9BCD5KPWA1', 'FINANCE_DELETE', 'Delete finance records', 'Financial', NOW(), NOW(), false),
  ('01KYFS8BHRVW0SGACXRN1VNQMC', 'FINANCE_EDIT', 'Edit finance records', 'Financial', NOW(), NOW(), false),
  ('01M040ZM31CW10XAZ0B0C58E0Z', 'FINANCE_REFUND_APPROVE', 'Approve refunds', 'Financial', NOW(), NOW(), false),
  ('01KYFS8BHR8EWFPYFMNCCGX5YM', 'FINANCE_VIEW', 'View finance records', 'Financial', NOW(), NOW(), false),
  ('01M00K84X5AJ771E969J0Q52RS', 'FLIGHT_MANAGE', 'Manage flight bookings', 'Flights', NOW(), NOW(), false),
  ('01M00K84X3ZMS990XA5JCABXNY', 'FLIGHT_VIEW', 'View flight bookings', 'Flights', NOW(), NOW(), false),
  ('01M0SSVHN5651PABCS0JNK0JAK', 'INQUIRY_MANAGE', 'Manage inquiries', 'Inquiries', NOW(), NOW(), false),
  ('01M0SSVHN4XV7WTQHH11BFE5BE', 'INQUIRY_VIEW', 'View inquiries', 'Inquiries', NOW(), NOW(), false),
  ('01KYFS8BHKQ4YWJB36NKBVRQEA', 'PACKAGE_CREATE', 'Create packages', 'Packages', NOW(), NOW(), false),
  ('01KYFS8BHMGNT01NN4P6CQ5Q7N', 'PACKAGE_DELETE', 'Delete packages', 'Packages', NOW(), NOW(), false),
  ('01KYFS8BHMCW48X4V00ZK9SVRT', 'PACKAGE_EDIT', 'Edit packages', 'Packages', NOW(), NOW(), false),
  ('01KYFS8BHKB71JDTC3WY9WND3P', 'PACKAGE_VIEW', 'View packages', 'Packages', NOW(), NOW(), false),
  ('01KYFS8BHNAWGGFPRS5F3W864B', 'REGISTRATION_CREATE', 'Create registrations', 'Registrations', NOW(), NOW(), false),
  ('01KYFS8BHQ76QE92MESADBPPSQ', 'REGISTRATION_DELETE', 'Delete registrations', 'Registrations', NOW(), NOW(), false),
  ('01KYFS8BHP9X3Z7C5Q6E5QET0X', 'REGISTRATION_EDIT', 'Edit registrations', 'Registrations', NOW(), NOW(), false),
  ('01KYFS8BHPBJ05Q1TJW0PC11J3', 'REGISTRATION_VIEW', 'View registrations', 'Registrations', NOW(), NOW(), false),
  ('01KYFS8BHVBT13EA0AC9BG00HK', 'TRAVEL_GROUP_MANAGE', 'Manage travel groups', 'Travel Groups', NOW(), NOW(), false),
  ('01KYT9DJNVAPT2EHX3Q8FKEBYZ', 'TRAVEL_GROUP_VIEW', 'View travel groups', 'Travel Groups', NOW(), NOW(), false),
  ('01KYFS8BHHSX3H22SR0YQ6F8QA', 'TRAVELLER_CREATE', 'Create travellers', 'Travellers', NOW(), NOW(), false),
  ('01KYFS8BHJB4VW5PC9RV6QB72B', 'TRAVELLER_DELETE', 'Delete travellers', 'Travellers', NOW(), NOW(), false),
  ('01KYFS8BHJVSJBV6GFJP75QXEK', 'TRAVELLER_EDIT', 'Edit travellers', 'Travellers', NOW(), NOW(), false),
  ('01KYFS8BHHQGEGGVME6JPPQG50', 'TRAVELLER_VIEW', 'View travellers', 'Travellers', NOW(), NOW(), false),
  ('01KYFS8BHEYVNEVT87F4BFWT24', 'USER_CREATE', 'Create users', 'Users & Auth', NOW(), NOW(), false),
  ('01KYFS8BHG9PH758B0H6641ATY', 'USER_DELETE', 'Delete users', 'Users & Auth', NOW(), NOW(), false),
  ('01KYFS8BHFNZR784YR0P0M6RKT', 'USER_EDIT', 'Edit users', 'Users & Auth', NOW(), NOW(), false),
  ('01KYFS8BHFX3WQ8JTFQCNYHBWF', 'USER_VIEW', 'View users', 'Users & Auth', NOW(), NOW(), false),
  ('01KYFS8BHTT9DZW8KM8PNFQ1GJ', 'VISA_MANAGE', 'Manage visas', 'Visa', NOW(), NOW(), false),
  ('01KZGK9AEXZ2JYGD6AZER6MY8W', 'VISA_VIEW', 'View visas', 'Visa', NOW(), NOW(), false);

-- Role permissions
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)

SELECT '01M1E54PPV9FA10YXNXTZSJSGB', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'ACCOMMODATION_MANAGE'
UNION ALL
SELECT '01M1E54PPJ99VVZR3MTT8YAGKV', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'AUTH_MANAGE'
UNION ALL
SELECT '01M1E54PPWBNR6NSAX51J28TM8', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'DASHBOARD_VIEW'
UNION ALL
SELECT '01M1E54PPTXVW7GGKWN9BCT4FS', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'DOCUMENT_MANAGE'
UNION ALL
SELECT '01M1E54PPXRVN7WFCHPS2X438V', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'DOCUMENT_VIEW'
UNION ALL
SELECT '01M1E54PPRKB8QK4T5YN8B74Y0', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_CREATE'
UNION ALL
SELECT '01M1E54PPYGVQ535DRJBT2E6XQ', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_CREDIT_AUTHORIZE'
UNION ALL
SELECT '01M1E54PQ0VSGXW755XNV6HXGN', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_CREDIT_REQUEST'
UNION ALL
SELECT '01M1E54PPT5BC168N6326N8DYE', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_DELETE'
UNION ALL
SELECT '01M1E54PPSB4BHX1PERNYCTKB4', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_EDIT'
UNION ALL
SELECT '01M1E54PPZA47QVE64PQ0S7AXP', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_REFUND_APPROVE'
UNION ALL
SELECT '01M1E54PPS4PKR11T4J9VXBGJZ', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FINANCE_VIEW'
UNION ALL
SELECT '01M1E54PPY94CWCGVN3SGMMAJG', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FLIGHT_MANAGE'
UNION ALL
SELECT '01M1E54PPX65F9CMVC1CWC3J2P', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'FLIGHT_VIEW'
UNION ALL
SELECT '01M1E54PPZ0G9ENNB0D9V0M51S', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_MANAGE'
UNION ALL
SELECT '01M1E54PPZK0NQBXSH22YXG51R', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_VIEW'
UNION ALL
SELECT '01M1E54PPM7XWMAFAJMX3T5Q3Q', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'PACKAGE_CREATE'
UNION ALL
SELECT '01M1E54PPN6179J0AJG1F8DER2', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'PACKAGE_DELETE'
UNION ALL
SELECT '01M1E54PPN86R1PK61C5VJCYYA', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'PACKAGE_EDIT'
UNION ALL
SELECT '01M1E54PPKRTNHZ4JX1R4N00QC', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'PACKAGE_VIEW'
UNION ALL
SELECT '01M1E54PPPDVHX15Q7R6TJ6A4N', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'REGISTRATION_CREATE'
UNION ALL
SELECT '01M1E54PPRBBVF3ZS64YZ115E3', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'REGISTRATION_DELETE'
UNION ALL
SELECT '01M1E54PPPDVEXKXRJ6JB17YEM', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'REGISTRATION_EDIT'
UNION ALL
SELECT '01M1E54PPQ4J8H8YKPCJJ3WQCY', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'REGISTRATION_VIEW'
UNION ALL
SELECT '01M1E54PPWQHYDDMF0TWKEJXDE', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVEL_GROUP_MANAGE'
UNION ALL
SELECT '01M1E54PPW7CCKXZX58RPVESJT', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVEL_GROUP_VIEW'
UNION ALL
SELECT '01M1E54PPJ54134N2DW1G7QTN8', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVELLER_CREATE'
UNION ALL
SELECT '01M1E54PPKYT2M6RKDZKAMSH75', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVELLER_DELETE'
UNION ALL
SELECT '01M1E54PPK5X1BXTGY785HYGHD', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVELLER_EDIT'
UNION ALL
SELECT '01M1E54PPJXQZ8YY2G44KWNEQV', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'TRAVELLER_VIEW'
UNION ALL
SELECT '01M1E54PPG6PHQ2Q88SASQ7QKG', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'USER_CREATE'
UNION ALL
SELECT '01M1E54PPHMKJDGN47ZFEPTX2V', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'USER_DELETE'
UNION ALL
SELECT '01M1E54PPG4CWP08CFMFMC137F', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'USER_EDIT'
UNION ALL
SELECT '01M1E54PPH6H8HHFEW5W7K5FJE', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'USER_VIEW'
UNION ALL
SELECT '01M1E54PPVSXTEDGMJHM737Z1B', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'VISA_MANAGE'
UNION ALL
SELECT '01M1E54PPX9MBRNGBTD4VVXVVK', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'ADMIN' AND p.permission_code = 'VISA_VIEW'
UNION ALL
SELECT '01M1E54PQHM89BW15PSD8GP71A', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'DASHBOARD_VIEW'
UNION ALL
SELECT '01M1E54PQG9PRFJAX5MYNNGSE6', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'DOCUMENT_MANAGE'
UNION ALL
SELECT '01M1E54PQJ784Q89C7E3C45G6R', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'DOCUMENT_VIEW'
UNION ALL
SELECT '01M1E54PQF27KPS4M0CXX4GQ4B', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FINANCE_CREATE'
UNION ALL
SELECT '01M1E54PQM3VRTQJGYTHEP6TFJ', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FINANCE_CREDIT_REQUEST'
UNION ALL
SELECT '01M1E54PQGKK5QGTVTPEPQ90K1', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FINANCE_EDIT'
UNION ALL
SELECT '01M1E54PQF90BTBX2FTKM8D0R8', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FINANCE_VIEW'
UNION ALL
SELECT '01M1E54PQK0H853BS0QTP1NWTP', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FLIGHT_MANAGE'
UNION ALL
SELECT '01M1E54PQJ572PQP121XNSGXM3', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'FLIGHT_VIEW'
UNION ALL
SELECT '01M1E54PQMAV9PWZD49APXC4TX', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_MANAGE'
UNION ALL
SELECT '01M1E54PQK7DZ5ZN6VQK7J0E7N', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_VIEW'
UNION ALL
SELECT '01M1E54PQEJMM7QDP6B5T1HSG7', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'PACKAGE_VIEW'
UNION ALL
SELECT '01M1E54PQEMWDJNC6VET3SJT1M', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'REGISTRATION_CREATE'
UNION ALL
SELECT '01M1E54PQF3PGTTRA41KZ5J9A3', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'REGISTRATION_VIEW'
UNION ALL
SELECT '01M1E54PQHPHAMN4PYHMBRCY3M', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'TRAVEL_GROUP_MANAGE'
UNION ALL
SELECT '01M1E54PQHAAWN4Z93GFFW3XZ2', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'TRAVEL_GROUP_VIEW'
UNION ALL
SELECT '01M1E54PQDA7J82SA5X1YJ9BZG', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'TRAVELLER_CREATE'
UNION ALL
SELECT '01M1E54PQEVZ3Z0F608J9M38XW', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'TRAVELLER_EDIT'
UNION ALL
SELECT '01M1E54PQDN5TFJV5E2REAB6BQ', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'TRAVELLER_VIEW'
UNION ALL
SELECT '01M1E54PQGA7C9Q0BF5MPE4Z2Q', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'VISA_MANAGE'
UNION ALL
SELECT '01M1E54PQJSR6RXWHTHS0Q7ZHH', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'AGENT' AND p.permission_code = 'VISA_VIEW'
UNION ALL
SELECT '01M1E54PQ6FR31XG6CVWVKMZKF', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'ACCOMMODATION_MANAGE'
UNION ALL
SELECT '01M1E54PQ71AAWPJTPAT5B8KTT', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'DASHBOARD_VIEW'
UNION ALL
SELECT '01M1E54PQ5H9VM57BTFK5APQD1', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'DOCUMENT_MANAGE'
UNION ALL
SELECT '01M1E54PQAAZQJPTEY5CFZ9XZT', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'DOCUMENT_VIEW'
UNION ALL
SELECT '01M1E54PQ3PFPKRHB9NMV2TDEF', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FINANCE_CREATE'
UNION ALL
SELECT '01M1E54PQD3SW8CH2PSS9KYWHT', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FINANCE_CREDIT_REQUEST'
UNION ALL
SELECT '01M1E54PQ4HJ6KX48NDE425X9J', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FINANCE_EDIT'
UNION ALL
SELECT '01M1E54PQBCNGYB6FMVV0HA579', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FINANCE_REFUND_APPROVE'
UNION ALL
SELECT '01M1E54PQ4J31KPKZ8DERJ4Q6Y', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FINANCE_VIEW'
UNION ALL
SELECT '01M1E54PQBJ2C73F8KBERHMWXH', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FLIGHT_MANAGE'
UNION ALL
SELECT '01M1E54PQA7HD6PXZCCJQJAF3K', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'FLIGHT_VIEW'
UNION ALL
SELECT '01M1E54PQCNPS4X2FWM9J272PE', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_MANAGE'
UNION ALL
SELECT '01M1E54PQCKFFBQ9NM0ZADPW3Z', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_VIEW'
UNION ALL
SELECT '01M1E54PQ1Z8ZCGG4KXEVN1NXJ', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'PACKAGE_CREATE'
UNION ALL
SELECT '01M1E54PQ282GA4BEW820MSR9B', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'PACKAGE_EDIT'
UNION ALL
SELECT '01M1E54PQ1EB6ZF1AX3DWVXZC8', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'PACKAGE_VIEW'
UNION ALL
SELECT '01M1E54PQ2560BWNZ50NDT5YHA', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'REGISTRATION_CREATE'
UNION ALL
SELECT '01M1E54PQ3FBMPJJPEZ74BX1FY', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'REGISTRATION_EDIT'
UNION ALL
SELECT '01M1E54PQ3Y4ZPQJR6F3QKB76W', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'REGISTRATION_VIEW'
UNION ALL
SELECT '01M1E54PQ7BYZ68M0366Z5GWGE', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'TRAVEL_GROUP_MANAGE'
UNION ALL
SELECT '01M1E54PQ8G8YQ0G6S39MWVRQP', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'TRAVEL_GROUP_VIEW'
UNION ALL
SELECT '01M1E54PQ0RMPNMNA1EANTFFMP', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'TRAVELLER_CREATE'
UNION ALL
SELECT '01M1E54PQ1N0E4M169CGEVA11V', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'TRAVELLER_EDIT'
UNION ALL
SELECT '01M1E54PQ0YCPF3E1NMQETCE1N', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'TRAVELLER_VIEW'
UNION ALL
SELECT '01M1E54PQ6K6QT58JN46FARQ00', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'VISA_MANAGE'
UNION ALL
SELECT '01M1E54PQ8XD5WVBDBKFMVPXZB', r.id, p.id, NOW(), NOW(), false FROM roles r CROSS JOIN permissions p WHERE r.role_code = 'MANAGER' AND p.permission_code = 'VISA_VIEW'
;
