<?php

declare(strict_types=1);

http_response_code(410);
exit('Web migrations are disabled. Run bin/migrate.php from the CLI.');
