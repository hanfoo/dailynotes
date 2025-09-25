const { ipcRenderer } = require('electron');
const fs = require('fs');


let labels = [];
let files = [];

// 监听从主进程发送的配置路径
ipcRenderer.on('config-settings-path', (event, path) => {
  console.log("Setting window: path:", path);

	myConfigPath = path;
  // 尝试加载 data.json
	try {
		const data = fs.readFileSync(myConfigPath, 'utf-8');
		const jsonData = JSON.parse(data);

    console.log(jsonData);

		// 填充 labels
		jsonData.labels.split(',').forEach(label => {
			if (label) {
				addLabel(label.trim());
			}
		});

		// 填充 writer
		const writerElement = document.getElementById('writer');
		const customWriterElement = document.getElementById('custom-writer');

		writerElement.innerHTML = `
				<option value="txt">txt</option>
				<option value="md">md</option>
		`;

		if (jsonData.writer && jsonData.writer !== 'txt' && jsonData.writer !== 'md') {
			const option = document.createElement('option');
			option.value = jsonData.writer;
			option.textContent = jsonData.writer;
			writerElement.appendChild(option);
			writerElement.value = jsonData.writer; // 选中自定义类型
		} else {
			writerElement.value = jsonData.writer || 'txt'; // 默认值为 'txt'
		}

		// 最后添加自定义选项
		const customOption = document.createElement('option');
		customOption.value = 'custom';
		customOption.textContent = 'Customize...';
		writerElement.appendChild(customOption);

		// 显示自定义输入框
		customWriterElement.value = (jsonData.writer === 'custom') ? jsonData.custom_writer || '' : '';
		customWriterElement.style.display = (jsonData.writer === 'custom') ? 'block' : 'none';

		// 填充 template
		document.getElementById('template').value = jsonData.template || '';

		// 填充 application
		const applicationSelect = document.getElementById('application-select');
		const applicationCustomInput = document.getElementById('application-custom');
		document.getElementById('application-section').style.display = 'none';

		if (jsonData.application === "/Applications/Visual Studio Code.app/Contents/MacOS/Electron") {
			applicationSelect.value = jsonData.application; // 默认选中
			applicationCustomInput.style.display = 'none'; // 隐藏文本框
		} else {
			applicationSelect.value = 'custom'; // 选择自定义
			applicationCustomInput.value = jsonData.application || ''; // 填充自定义值
			applicationCustomInput.style.display = 'block'; // 显示文本框
		}

    document.getElementById('setting-file-path').innerHTML = myConfigPath;

		// 填充 user defined files
		jsonData.user_defined_file.split(',').forEach(file => {
			if (file) {
				addFile(file.trim());
			}
		});
	} catch (error) {
		console.error('Error loading data.json:', error);
	}
});


window.onload = async function() {
	// todo
};

function addLabel(existingLabel = '') {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-item';

    const nameInput = document.createElement('input');
    nameInput.placeholder = 'Label';
    nameInput.value = existingLabel.split(' ')[0] || '';

    const timeSelect = document.createElement('select');
    ['5 days', 'weekly', 'monthly', 'quarterly', 'yearly'].forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        if (existingLabel.includes(time)) {
            option.selected = true;
        }
        timeSelect.appendChild(option);
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
        labelDiv.remove();
    };

    labelDiv.appendChild(nameInput);
    labelDiv.appendChild(timeSelect);
    labelDiv.appendChild(deleteButton);
    
    document.getElementById('labels').appendChild(labelDiv);
}

function addFile(existingFile = '') {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-item';

    const fileInput = document.createElement('input');
    fileInput.placeholder = 'File Name';
    fileInput.value = existingFile || '';

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => {
        fileDiv.remove();
    };

    fileDiv.appendChild(fileInput);
    fileDiv.appendChild(deleteButton);

    document.getElementById('files').appendChild(fileDiv);
}

function getJsonData() {
    const labelsArray = Array.from(document.querySelectorAll('.label-item')).map(label => {
        const name = label.children[0].value;
        const time = label.children[1].value;
        return name ? `${name} ${time}` : null; // 忽略空标签
    }).filter(Boolean).join(',');

    const filesArray = Array.from(document.querySelectorAll('.file-item')).map(file => {
        return file.children[0].value;
    }).filter(fileName => fileName).join(','); // 忽略空文件名

    const writerSelect = document.getElementById('writer');
    const customWriterInput = document.getElementById('custom-writer');
    const writerValue = writerSelect.value === 'custom' && customWriterInput.value ? customWriterInput.value : writerSelect.value;

    const applicationSelect = document.getElementById('application-select');
    const applicationCustomInput = document.getElementById('application-custom');
    const applicationValue = applicationSelect.value === 'custom' ? applicationCustomInput.value : applicationSelect.value;

      // 处理 template 内容
    let templateValue = document.getElementById('template').value;
    templateValue = templateValue.replace(/#(\S)/g, '# $1'); // 在 # 和随后的文本之间添加空格

    const jsonData = {
        labels: labelsArray,
        writer: writerValue,
        template: templateValue,
        application: applicationValue || '', // 允许为空
        user_defined_file: filesArray
    };
/*
		// test only, save to local file

    const jsonString = JSON.stringify(jsonData, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
*/
  return jsonData;
}

function saveJson() {
  const jsonData = this.getJsonData();
  ipcRenderer.send('save-settings-data', jsonData);
  window.close();
}

function exportJson() {
  const jsonData = this.getJsonData();
  ipcRenderer.send('export-settings-data', jsonData);
}

function cancel() {
    window.close();
}

// 监听 writer 的变化
document.getElementById('writer').addEventListener('change', function() {
    const customWriterInput = document.getElementById('custom-writer');
    customWriterInput.style.display = this.value === 'custom' ? 'block' : 'none';
});

// 监听 application-select 的变化
document.getElementById('application-select').addEventListener('change', function() {
    const applicationCustomInput = document.getElementById('application-custom');
    applicationCustomInput.style.display = this.value === 'custom' ? 'block' : 'none';
});

// 切换 Application 的显示状态
function toggleApplication() {
    const applicationSection = document.getElementById('application-section');
    applicationSection.style.display = applicationSection.style.display === 'none' ? 'block' : 'none';
}
