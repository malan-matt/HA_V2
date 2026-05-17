<?php
/**
 * GetFlight endpoint (spec name). File name matches existing deployment.
 */
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$user = verifyAuthOrServer();
$flightId = $_GET['id'] ?? null;

if (!$flightId) {
    http_response_code(400);
    echo json_encode(['error' => 'Flight ID required']);
    exit();
}

$conn = getDBConnection();

if ($user['type'] === 'ATC' || $user['type'] === 'Server') {
    $query = "
        SELECT
            f.*,
            o.iata_code AS origin_code, o.city AS origin_city, o.latitude AS origin_lat, o.longitude AS origin_lon,
            d.iata_code AS dest_code, d.city AS dest_city, d.latitude AS dest_lat, d.longitude AS dest_lon,
            COUNT(pf.id) AS total_passengers,
            SUM(CASE WHEN pf.boarding_confirmed = 1 THEN 1 ELSE 0 END) AS confirmed_passengers
        FROM flights f
        JOIN airports o ON f.origin_airport_id = o.id
        JOIN airports d ON f.destination_airport_id = d.id
        LEFT JOIN passenger_flights pf ON f.id = pf.flight_id
        WHERE f.id = ?
        GROUP BY f.id
    ";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $flightId);
} else {
    $query = "
        SELECT
            f.*,
            o.iata_code AS origin_code, o.city AS origin_city, o.latitude AS origin_lat, o.longitude AS origin_lon,
            d.iata_code AS dest_code, d.city AS dest_city, d.latitude AS dest_lat, d.longitude AS dest_lon,
            pf.boarding_confirmed, pf.confirmed_at, pf.seat_number
        FROM flights f
        JOIN airports o ON f.origin_airport_id = o.id
        JOIN airports d ON f.destination_airport_id = d.id
        JOIN passenger_flights pf ON f.id = pf.flight_id
        WHERE f.id = ? AND pf.passenger_id = ?
    ";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('ii', $flightId, $user['id']);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Flight not found or access denied']);
    exit();
}

$flight = $result->fetch_assoc();

$response = [
    'id' => (int) $flight['id'],
    'flight_number' => $flight['flight_number'],
    'status' => $flight['status'],
    'current_latitude' => (float) $flight['current_latitude'],
    'current_longitude' => (float) $flight['current_longitude'],
    'dispatched_at' => $flight['dispatched_at'],
    'flight_duration_hours' => (float) $flight['flight_duration_hours'],
    'departure_time' => $flight['departure_time'],
    'origin' => [
        'code' => $flight['origin_code'],
        'city' => $flight['origin_city'],
        'lat' => (float) $flight['origin_lat'],
        'lon' => (float) $flight['origin_lon'],
    ],
    'destination' => [
        'code' => $flight['dest_code'],
        'city' => $flight['dest_city'],
        'lat' => (float) $flight['dest_lat'],
        'lon' => (float) $flight['dest_lon'],
    ],
];

if ($user['type'] === 'ATC' || $user['type'] === 'Server') {
    $response['total_passengers'] = (int) $flight['total_passengers'];
    $response['confirmed_passengers'] = (int) $flight['confirmed_passengers'];
} else {
    $response['boarding_confirmed'] = (bool) $flight['boarding_confirmed'];
    $response['confirmed_at'] = $flight['confirmed_at'];
    $response['seat_number'] = $flight['seat_number'];
}

echo json_encode(['success' => true, 'flight' => $response]);
