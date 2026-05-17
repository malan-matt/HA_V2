<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

verifyAuth();

$conn = getDBConnection();
$result = $conn->query(
    'SELECT id, iata_code AS code, city, latitude AS lat, longitude AS lon FROM airports ORDER BY city'
);

$airports = [];
while ($row = $result->fetch_assoc()) {
    $airports[] = [
        'id' => (int) $row['id'],
        'code' => $row['code'],
        'city' => $row['city'],
        'lat' => (float) $row['lat'],
        'lon' => (float) $row['lon'],
    ];
}

echo json_encode(['success' => true, 'airports' => $airports]);
