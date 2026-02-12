/**
 * BFS路径查找器
 * 计算战斗单位的移动路径和可移动区域
 */

import { 
    TERRAIN_RESISTANCE,
    PATH_CONSTANTS 
} from '../../utils/Constants.js';

export class PathFinder {
    constructor() {
        this.gridSize = PATH_CONSTANTS.PATH_GRID_SIZE;
    }

    /**
     * 计算可移动区域（BFS）
     */
    calculateMoveArea(startX, startY, movePower, armyType, mapData, obstacles = []) {
        const gridSize = this.gridSize;
        const halfGrid = Math.floor(gridSize / 2);

        // 初始化路径网格
        const pathGrid = new Array(gridSize * gridSize).fill(PATH_CONSTANTS.MOV_OVER);

        // 映射地形阻力
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const mapX = startX - halfGrid + x;
                const mapY = startY - halfGrid + y;

                if (this.isValidMapPosition(mapX, mapY, mapData)) {
                    const terrain = this.getTerrain(mapX, mapY, mapData);
                    const resistance = TERRAIN_RESISTANCE[armyType]?.[terrain] || 2;
                    pathGrid[y * gridSize + x] = resistance;
                }
            }
        }

        // 设置障碍物
        obstacles.forEach(obs => {
            const localX = obs.x - (startX - halfGrid);
            const localY = obs.y - (startY - halfGrid);

            if (localX >= 0 && localX < gridSize && localY >= 0 && localY < gridSize) {
                if (obs.type === 'enemy') {
                    // 敌方单位所在格不可通过
                    pathGrid[localY * gridSize + localX] = PATH_CONSTANTS.MOV_NOT;
                    // 周围4格标记为可攻击
                    this.markAttackable(pathGrid, localX, localY, gridSize);
                } else if (obs.type === 'ally') {
                    // 友方单位所在格不可通过
                    pathGrid[localY * gridSize + localX] = PATH_CONSTANTS.MOV_NOT;
                }
            }
        });

        // BFS展开路径树
        const startGridX = halfGrid;
        const startGridY = halfGrid;
        pathGrid[startGridY * gridSize + startGridX] = movePower + PATH_CONSTANTS.MOV_RSTD;

        const queue = [{ x: startGridX, y: startGridY, power: movePower }];
        const visited = new Set([`${startGridX},${startGridY}`]);

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            for (const dir of directions) {
                const newX = current.x + dir.dx;
                const newY = current.y + dir.dy;

                if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) {
                    continue;
                }

                const index = newY * gridSize + newX;
                const resistance = pathGrid[index];

                if (resistance >= PATH_CONSTANTS.MOV_NOT) {
                    continue;
                }

                const newPower = current.power - resistance;

                if (newPower > 0) {
                    const key = `${newX},${newY}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        pathGrid[index] = newPower + PATH_CONSTANTS.MOV_RSTD;
                        queue.push({ x: newX, y: newY, power: newPower });
                    }
                }
            }
        }

        // 提取可移动区域
        const movableArea = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const index = y * gridSize + x;
                if (pathGrid[index] >= PATH_CONSTANTS.MOV_RSTD && 
                    pathGrid[index] < PATH_CONSTANTS.MOV_NOT) {
                    movableArea.push({
                        x: startX - halfGrid + x,
                        y: startY - halfGrid + y,
                        gridX: x,
                        gridY: y,
                        remainingPower: pathGrid[index] - PATH_CONSTANTS.MOV_RSTD
                    });
                }
            }
        }

        return {
            pathGrid,
            movableArea,
            offsetX: startX - halfGrid,
            offsetY: startY - halfGrid
        };
    }

    /**
     * 标记可攻击位置
     */
    markAttackable(pathGrid, x, y, gridSize) {
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        directions.forEach(dir => {
            const newX = x + dir.dx;
            const newY = y + dir.dy;

            if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
                const index = newY * gridSize + newX;
                pathGrid[index] |= 0x20;
            }
        });
    }

    /**
     * 计算攻击范围
     */
    calculateAttackRange(x, y, range, mapData) {
        const attackRange = [];

        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const targetX = x + dx;
                const targetY = y + dy;

                // 曼哈顿距离
                if (Math.abs(dx) + Math.abs(dy) <= range) {
                    if (this.isValidMapPosition(targetX, targetY, mapData)) {
                        attackRange.push({
                            x: targetX,
                            y: targetY,
                            distance: Math.abs(dx) + Math.abs(dy)
                        });
                    }
                }
            }
        }

        return attackRange;
    }

    /**
     * 查找路径（A*算法）
     */
    findPath(startX, startY, endX, endY, armyType, mapData, obstacles = []) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startX},${startY}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));
        openSet.push({ x: startX, y: startY, f: fScore.get(startKey) });

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            if (current.x === endX && current.y === endY) {
                return this.reconstructPath(cameFrom, currentKey);
            }

            closedSet.add(currentKey);

            for (const dir of directions) {
                const neighborX = current.x + dir.dx;
                const neighborY = current.y + dir.dy;
                const neighborKey = `${neighborX},${neighborY}`;

                if (!this.isValidMapPosition(neighborX, neighborY, mapData)) {
                    continue;
                }

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const isObstacle = obstacles.some(obs => 
                    obs.x === neighborX && obs.y === neighborY
                );

                if (isObstacle) {
                    continue;
                }

                const terrain = this.getTerrain(neighborX, neighborY, mapData);
                const resistance = TERRAIN_RESISTANCE[armyType]?.[terrain] || 2;

                const tentativeG = (gScore.get(currentKey) || 0) + resistance;

                const neighborInOpen = openSet.find(n => n.x === neighborX && n.y === neighborY);

                if (!neighborInOpen || tentativeG < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, currentKey);
                    gScore.set(neighborKey, tentativeG);
                    fScore.set(neighborKey, tentativeG + this.heuristic(neighborX, neighborY, endX, endY));

                    if (!neighborInOpen) {
                        openSet.push({ x: neighborX, y: neighborY, f: fScore.get(neighborKey) });
                    }
                }
            }
        }

        return null;
    }

    /**
     * 启发函数（曼哈顿距离）
     */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    /**
     * 重建路径
     */
    reconstructPath(cameFrom, currentKey) {
        const path = [this.parseKey(currentKey)];

        while (cameFrom.has(currentKey)) {
            currentKey = cameFrom.get(currentKey);
            path.unshift(this.parseKey(currentKey));
        }

        return path;
    }

    /**
     * 解析键值
     */
    parseKey(key) {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    }

    /**
     * 检查地图位置是否有效
     */
    isValidMapPosition(x, y, mapData) {
        return x >= 0 && y >= 0 && y < mapData.length && x < (mapData[0]?.length || 0);
    }

    /**
     * 获取地形类型
     */
    getTerrain(x, y, mapData) {
        if (!this.isValidMapPosition(x, y, mapData)) {
            return 0;
        }
        return mapData[y][x];
    }
}
