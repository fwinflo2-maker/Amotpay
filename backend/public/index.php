<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use AmotPay\Config\Env;
use AmotPay\Http\Request;
use AmotPay\Http\ApiException;
use AmotPay\Http\Response;
use AmotPay\Router;

Env::load(__DIR__ . '/../.env');

try {
    (new Router())->dispatch(Request::capture());
} catch (ApiException $e) {
    Response::error($e->getMessage(), $e->status, $e->errorCode);
} catch (Throwable) {
    Response::error('Internal server error', 500, 'SERVER_ERROR');
}
