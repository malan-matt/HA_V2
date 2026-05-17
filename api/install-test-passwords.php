<?php
/**
 * One-time helper: sets known test passwords on Wheatley.
 * Call once with X-API-Key header (same as SERVER_API_KEY in config.php), then delete this file.
 *
 *   curl -H "X-API-Key: YOUR_SERVER_KEY" \
 *     https://wheatley.cs.up.ac.za/u25009801/public_html/api/install-test-passwords.php
 */
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

verifyServerAuth();

$conn = getDBConnection();

$users = [
    ['atc_admin', 'atc_salt_2026', '634578ec7f9214232bfcf612ecbe2efb9f286cfa7b957f831243b5a46ba28304'],
    ['passenger1', 'pass1_salt_2026', '2632a3d5c28ccf6aeb6dd3cc7c063d5051eaef66d76290f74574a0280fff1023'],
    ['passenger2', 'pass2_salt_2026', 'ed4e18d945adf0cbd88c3bdf2060541296a63706069da06240c924064406dc10'],
];

$updated = [];
$stmt = $conn->prepare('UPDATE users SET salt = ?, password = ? WHERE username = ?');

foreach ($users as [$username, $salt, $hash]) {
    $stmt->bind_param('sss', $salt, $hash, $username);
    $stmt->execute();
    $updated[] = ['username' => $username, 'rows' => $stmt->affected_rows];
}

echo json_encode([
    'success' => true,
    'message' => 'Test passwords installed. Use atc_admin/atc123 and passenger1/pass123. Delete install-test-passwords.php.',
    'logins' => [
        'atc_admin' => 'atc123',
        'passenger1' => 'pass123',
        'passenger2' => 'pass123',
    ],
    'updated' => $updated,
]);
