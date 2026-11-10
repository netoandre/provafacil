<?php
$results = [0, 0, 0, 0];
for ($i = 0; $i < 100000; $i++) {
    $a = [101, 102, 103, 104]; // Mock IDs
    shuffle($a);
    $pos = array_search(101, $a); // Assume 101 is the correct one
    $results[$pos]++;
}

echo "Total: 100000\n";
echo "A (0): " . $results[0] . " (" . ($results[0]/1000) . "%)\n";
echo "B (1): " . $results[1] . " (" . ($results[1]/1000) . "%)\n";
echo "C (2): " . $results[2] . " (" . ($results[2]/1000) . "%)\n";
echo "D (3): " . $results[3] . " (" . ($results[3]/1000) . "%)\n";
