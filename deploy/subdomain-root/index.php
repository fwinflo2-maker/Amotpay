<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use AmotPay\Http\Request;
use AmotPay\Router;

$router = new Router();
$router->dispatch(Request::capture());
