/**
 * 地图渲染器
 * 负责渲染战略地图
 */

export class MapRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 渲染地图背景
     */
    renderBackground(width, height) {
        // 地图背景色
        this.ctx.fillStyle = '#2d4a22';
        this.ctx.fillRect(0, 0, width, height);

        // 绘制地形细节
        this.renderTerrainDetails(width, height);
    }

    /**
     * 渲染地形细节
     */
    renderTerrainDetails(width, height) {
        // 简化的地形纹理
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        // 随机地形线条
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const length = 50 + Math.random() * 100;
            const angle = Math.random() * Math.PI * 2;

            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            this.ctx.stroke();
        }
    }

    /**
     * 渲染城市连接
     */
    renderCityConnections(cities, connections) {
        this.ctx.strokeStyle = 'rgba(200, 180, 150, 0.3)';
        this.ctx.lineWidth = 2;

        connections.forEach(conn => {
            const city1 = cities.find(c => c.id === conn.from);
            const city2 = cities.find(c => c.id === conn.to);

            if (city1 && city2) {
                this.ctx.beginPath();
                this.ctx.moveTo(city1.screenX, city1.screenY);
                this.ctx.lineTo(city2.screenX, city2.screenY);
                this.ctx.stroke();
            }
        });
    }

    /**
     * 渲染网格
     */
    renderGrid(width, height, cellSize = 50) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x < width; x += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }

        for (let y = 0; y < height; y += cellSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
}
