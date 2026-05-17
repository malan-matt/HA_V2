-- Run after importing your schema dump (message.txt).
-- Test logins (flight-app users, NOT Wheatley hosting):
--   atc_admin   / atc123
--   passenger1  / pass123
--   passenger2  / pass123

UPDATE users SET
  salt = 'atc_salt_2026',
  password = '634578ec7f9214232bfcf612ecbe2efb9f286cfa7b957f831243b5a46ba28304'
WHERE username = 'atc_admin';

UPDATE users SET
  salt = 'pass1_salt_2026',
  password = '2632a3d5c28ccf6aeb6dd3cc7c063d5051eaef66d76290f74574a0280fff1023'
WHERE username = 'passenger1';

UPDATE users SET
  salt = 'pass2_salt_2026',
  password = 'ed4e18d945adf0cbd88c3bdf2060541296a63706069da06240c924064406dc10'
WHERE username = 'passenger2';
