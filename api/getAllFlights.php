<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$user = verifyAuth();
$conn = getDBConnection();

if ($user['type'] === 'ATC') {
    $query = "
        SELECT
            f.id, f.flight_number, f.status, f.current_latitude, f.current_longitude,
            f.dispatched_at, f.flight_duration_hours, f.departure_time,
            o.id AS origin_id, o.iata_code AS origin_code, o.city AS origin_city,
            o.latitude AS origin_lat, o.longitude AS origin_lon,
            d.id AS dest_id, d.iata_code AS dest_code, d.city AS dest_city,
            d.latitude AS dest_lat, d.longitude AS dest_lon
        FROM flights f
        JOIN airports o ON f.origin_airport_id = o.id
        JOIN airports d ON f.destination_airport_id = d.id
        ORDER BY f.departure_time
    ";
    $result = $conn->query($query);
} else {
    $query = "
        SELECT
            f.id, f.flight_number, f.status, f.current_latitude, f.current_longitude,
            f.dispatched_at, f.flight_duration_hours, f.departure_time,
            pf.boarding_confirmed, pf.confirmed_at, pf.seat_number,
            o.id AS origin_id, o.iata_code AS origin_code, o.city AS origin_city,
            o.latitude AS origin_lat, o.longitude AS origin_lon,
            d.id AS dest_id, d.iata_code AS dest_code, d.city AS dest_city,
            d.latitude AS dest_lat, d.longitude AS dest_lon
        FROM passenger_flights pf
        JOIN flights f ON pf.flight_id = f.id
        JOIN airports o ON f.origin_airport_id = o.id
        JOIN airports d ON f.destination_airport_id = d.id
        WHERE pf.passenger_id = ?
        ORDER BY f.departure_time
    ";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $user['id']);
    $stmt->execute();
    $result = $stmt->get_result();
}

$flights = [];
while ($row = $result->fetch_assoc()) {
    $item = [
        'id' => (int) $row['id'],
        'flight_number' => $row['flight_number'],
        'status' => $row['status'],
        'current_latitude' => (float) $row['current_latitude'],
        'current_longitude' => (float) $row['current_longitude'],
        'dispatched_at' => $row['dispatched_at'],
        'flight_duration_hours' => (float) $row['flight_duration_hours'],
        'departure_time' => $row['departure_time'],
        'origin' => [
            'id' => (int) $row['origin_id'],
            'code' => $row['origin_code'],
            'city' => $row['origin_city'],
            'lat' => (float) $row['origin_lat'],
            'lon' => (float) $row['origin_lon'],
        ],
        'destination' => [
            'id' => (int) $row['dest_id'],
            'code' => $row['dest_code'],
            'city' => $row['dest_city'],
            'lat' => (float) $row['dest_lat'],
            'lon' => (float) $row['dest_lon'],
        ],
    ];
    if ($user['type'] === 'Passenger') {
        $item['boarding_confirmed'] = (bool) $row['boarding_confirmed'];
        $item['confirmed_at'] = $row['confirmed_at'];
        $item['seat_number'] = $row['seat_number'];
    }
    $flights[] = $item;
}

echo json_encode(['success' => true, 'flights' => $flights]);
