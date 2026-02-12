/**
 * 路径查找工具
 * 使用BFS算法计算行军路径
 */

import { 
    TERRAIN_RESISTANCE, 
    PATH_CONSTANTS 
} from '../utils/Constants.js';

export class PathUtil {
    constructor() {
        this.gridSize = PATH_CONSTANTS.PATH_GRID_SIZE; // 15x15
    }

    /**
     * 计算可移动区域（BFS）
     * @param {number} startX - 起始X坐标
     * @param {number} startY - 起始Y坐标
     * @param {number} movePower - 移动力
     * @param {number} armyType - 兵种类型
     * @param {number[]} mapData - 地图地形数据
     * @param {Array} obstacles - 障碍物列表 [{x, y, type}]
     * @returns {Object} 可移动区域和路径信息
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
        
        // 起始点设为移动力值
        pathGrid[startGridY * gridSize + startGridX] = movePower + PATH_CONSTANTS.MOV_RSTD;
        
        // BFS队列
        const queue = [{ x: startGridX, y: startGridY, power: movePower }];
        const visited = new Set([`${startGridX},${startGridY}`]);
        
        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }, // 左
            { dx: 1, dy: 0 }   // 右
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
                
                // 不可通过的地形
                if (resistance >= PATH_CONSTANTS.MOV_NOT) {
                    continue;
                }
                
                // 计算新的移动力
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
                // 标记为可攻击（高位置位）
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
     * 查找路径（从起点到终点）
     * @returns {Array} 路径点数组
     */
    findPath(startX, startY, endX, endY, armyType, mapData, obstacles = []) {
        // 使用A*算法找到最优路径
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${startX},${startY}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(startX, startY, endX, endY));
        openSet.push({ x: startX, y: startY, f: fScore.get(startKey) });
        
        while (openSet.length > 0) {
            // 找出f值最小的节点
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;
            
            if (current.x === endX && current.y === endY) {
                // 重建路径
                return this.reconstructPath(cameFrom, currentKey);
            }
            
            closedSet.add(currentKey);
            
            // 检查相邻节点
            const directions = [
                { dx: 0, dy: -1 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 },
                { dx: 1, dy: 0 }
            ];
            
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
                
                // 检查是否是障碍物
                const isObstacle = obstacles.some(obs => 
                    obs.x === neighborX && obs.y === neighborY
                );
                
                if (isObstacle) {
                    continue;
                }
                
                const terrain = this.getTerrain(neighborX, neighborY, mapData);
                const resistance = TERRAIN_RESISTANCE[armyType]?.[terrain] || 2;
                
                const tentativeG = gScore.get(currentKey) + resistance;
                
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
        
        // 未找到路径
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
        // TODO: 根据实际地图数据检查边界
        return x >= 0 && y >= 0;
    }

    /**
     * 获取地形类型
     */
    getTerrain(x, y, mapData) {
        // TODO: 根据实际地图数据结构获取地形
        // 暂时返回草地
        return 0;
    }
}

// 创建单例
export const pathUtil = new PathUtil();
