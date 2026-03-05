const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'calendar_data.json');

app.use(bodyParser.json());
app.use(express.static('public')); 

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: [], restrictions: [] }, null, 2));
}

const getData = () => JSON.parse(fs.readFileSync(DATA_FILE));
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

app.get('/api/all', (req, res) => res.json(getData()));

app.post('/api/events', (req, res) => {
    const { title, dates, person, periods } = req.body;
    const data = getData();
    const conflicts = [];
    
    dates.forEach(d => {
        periods.forEach(p => {
            if (data.restrictions.some(r => r.person === person && r.date === d && r.period === p)) {
                conflicts.push(`${d}(${p})`);
            }
        });
    });
    
    if (conflicts.length > 0) return res.status(400).json({ error: `衝突！${person} 在 ${conflicts.join(', ')} 已禁排` });
    
    dates.forEach(date => {
        periods.forEach(period => {
            data.events.push({ id: Date.now().toString() + Math.random().toString(36).substring(2, 7), title, date, person, period });
        });
    });
    
    saveData(data);
    res.status(201).json({ message: '成功' });
});

app.post('/api/restrictions', (req, res) => {
    const { person, dates, periods } = req.body;
    const data = getData();
    
    dates.forEach(date => {
        periods.forEach(period => {
            if (!data.restrictions.some(r => r.person === person && r.date === date && r.period === period)) {
                data.restrictions.push({ id: Date.now().toString() + Math.random().toString(36).substring(2, 7), person, date, period });
            }
        });
    });
    
    saveData(data);
    res.json({ message: '成功' });
});

// ★ 新增：一鍵清除所有行程 (保留禁排設定)
app.delete('/api/events/all', (req, res) => {
    const data = getData();
    data.events = [];
    saveData(data);
    res.json({ message: '所有排程已清除' });
});

// 單筆刪除 (行程或禁排共用)
app.delete('/api/:type/:id', (req, res) => {
    const { type, id } = req.params;
    const data = getData();
    data[type] = data[type].filter(item => item.id.toString() !== id.toString());
    saveData(data);
    res.json({ message: '已刪除' });
});

app.listen(PORT, () => console.log(`系統啟動：http://localhost:${PORT}`));