function testEnemyAi() {
    if (!lastKnownPlayerPos) {
        lastKnownPlayerPos = { x: playerPosition.x, z: playerPosition.z };
    }

    const enemySpeed = 0.3 * 2;
    const randomFactor = 0.2;
    const enemyRadius = 20;
    const buffer = 0.3;
    const visionRange = 500;

    const dx = playerPosition.x - boyKisserEnemySpriteWorldPos.x;
    const dz = playerPosition.z - boyKisserEnemySpriteWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check for collision and apply damage
    const now = performance.now();
    if (distance < hitRadius && now - lastHitTime > hitCooldown) {
        playerHealth.playerHealth = Math.max(100, playerHealth.playerHealth - damagePerSecond);
        lastHitTime = now;
        console.log(`BoyKisser hit player! Health: ${playerHealth.playerHealth}`);
        testFuckingAround();
    }

    // Check for occlusion (BoyKisser)
    const isOccluded = isOccludedByWall(
        boyKisserEnemySpriteWorldPos.x, boyKisserEnemySpriteWorldPos.z,
        playerPosition.x, playerPosition.z,
        map_01, tileSectors
    );

    if (!isOccluded && distance < visionRange) {
        lastKnownPlayerPos.x = playerPosition.x;
        lastKnownPlayerPos.z = playerPosition.z;
        canSeePlayer = true;
    } else {
        canSeePlayer = false;
    }

    const targetX = canSeePlayer ? playerPosition.x : lastKnownPlayerPos.x;
    const targetZ = canSeePlayer ? playerPosition.z : lastKnownPlayerPos.z;
    const targetDx = targetX - boyKisserEnemySpriteWorldPos.x;
    const targetDz = targetZ - boyKisserEnemySpriteWorldPos.z;
    const targetDistance = Math.sqrt(targetDx * targetDx + targetDz * targetDz);

    if (targetDistance < 10) {
        console.log("BoyKisser reached target, pausing");
        return;
    }

    const dirX = targetDx / targetDistance;
    const dirZ = targetDz / targetDistance;

    const randomAngle = (Math.random() - 0.5) * randomFactor;
    const randomDirX = Math.cos(randomAngle) * dirX - Math.sin(randomAngle) * dirZ;
    const randomDirZ = Math.sin(randomAngle) * dirX + Math.cos(randomAngle) * dirZ;

    let newX = boyKisserEnemySpriteWorldPos.x + randomDirX * enemySpeed;
    let newZ = boyKisserEnemySpriteWorldPos.z + randomDirZ * enemySpeed;

    const mapWidth = map_01[0].length;
    const mapHeight = map_01.length;
    const minX = Math.floor((newX - enemyRadius) / tileSectors);
    const maxX = Math.floor((newX + enemyRadius) / tileSectors);
    const minZ = Math.floor((newZ - enemyRadius) / tileSectors);
    const maxZ = Math.floor((newZ + enemyRadius) / tileSectors);

    let collisionX = false;
    let collisionZ = false;

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            if (x >= 0 && x < mapWidth && z >= 0 && z < mapHeight) {
                const tile = map_01[z][x];
                if (tile.type === "wall") {
                    const tileLeft = x * tileSectors;
                    const tileRight = (x + 1) * tileSectors;
                    const tileTop = z * tileSectors;
                    const tileBottom = (z + 1) * tileSectors;

                    if (newX + enemyRadius > tileLeft && boyKisserPreviousPos.x + enemyRadius <= tileLeft) {
                        newX = tileLeft - enemyRadius - buffer;
                        collisionX = true;
                    } else if (newX - enemyRadius < tileRight && boyKisserPreviousPos.x - enemyRadius >= tileRight) {
                        newX = tileRight + enemyRadius + buffer;
                        collisionX = true;
                    }

                    if (newZ + enemyRadius > tileTop && boyKisserPreviousPos.z + enemyRadius <= tileTop) {
                        newZ = tileTop - enemyRadius - buffer;
                        collisionZ = true;
                    } else if (newZ - enemyRadius < tileBottom && boyKisserPreviousPos.z - enemyRadius >= tileBottom) {
                        newZ = tileBottom + enemyRadius + buffer;
                        collisionZ = true;
                    }
                }
            }
        }
    }

    if (!collisionX) {
        boyKisserEnemySpriteWorldPos.x = newX;
    }
    if (!collisionZ) {
        boyKisserEnemySpriteWorldPos.z = newZ;
    }

    boyKisserPreviousPos.x = boyKisserEnemySpriteWorldPos.x;
    boyKisserPreviousPos.z = boyKisserEnemySpriteWorldPos.z;

    const maxXBound = mapWidth * tileSectors - enemyRadius;
    const maxZBound = mapHeight * tileSectors - enemyRadius;
    boyKisserEnemySpriteWorldPos.x = Math.max(enemyRadius, Math.min(maxXBound, boyKisserEnemySpriteWorldPos.x));
    boyKisserEnemySpriteWorldPos.z = Math.max(enemyRadius, Math.min(maxZBound, boyKisserEnemySpriteWorldPos.z));

    console.log(`BoyKisser moved to: x=${boyKisserEnemySpriteWorldPos.x.toFixed(2)}, z=${boyKisserEnemySpriteWorldPos.z.toFixed(2)}, targetDistance=${targetDistance.toFixed(2)}, canSeePlayer=${canSeePlayer}`);
}
