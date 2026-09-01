<?php

declare(strict_types=1);

namespace AmotPay\Middleware;

use AmotPay\Http\Request;
use AmotPay\Http\Response;
use AmotPay\Services\AuthService;

final class AuthMiddleware
{
    public function __construct(private AuthService $auth = new AuthService()) {}

    public function handle(Request $request): ?array
    {
        $user = $this->auth->userFromToken($request->bearerToken());
        if (!$user) {
            Response::error('Unauthorized', 401, 'UNAUTHORIZED');
        }
        return $user;
    }
}
