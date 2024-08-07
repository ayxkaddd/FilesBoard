function getTokenHeader() {
    const token = localStorage.getItem("token");
    return `Bearer ${token}`;
}

async function fetchData(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            "Authorization": getTokenHeader(),
        }
    };
    if (body) {
        options.body = body;
        if (!(body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
        }
    }
    const response = await fetch(url, options);
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = '/login';
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}


function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
        }, 300);
    }, 3000);
}

function showModal(title, placeholder, confirmCallback) {
    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInput = document.getElementById('modalInput');
    const modalConfirm = document.getElementById('modalConfirm');

    modalTitle.textContent = title;
    modalInput.placeholder = placeholder;
    modalInput.value = '';

    modal.classList.remove('hidden');

    modalConfirm.onclick = () => {
        const inputValue = modalInput.value.trim();
        if (inputValue) {
            confirmCallback(inputValue);
        }
        modal.classList.add('hidden');
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    };
}

function navigateToFolder(folder) {
    currentFolder = folder;
    loadFiles(currentFolder);
}

async function loadFiles(folder = '') {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    try {
        const data = await fetchData(`api/files?folder=${encodeURIComponent(folder)}`)
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        data.files.forEach(file => {
            const fileElement = createFileElement(file);
            fileList.appendChild(fileElement);
        });
        updateBreadcrumb(folder);
    } catch (error) {
        showPopup('Failed to load files: ' + error.message, 'error');
    }
}

function updateBreadcrumb(folder) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';

    const parts = folder.split('/').filter(part => part !== '');

    const homeLink = document.createElement('a');
    homeLink.textContent = 'Home';
    homeLink.href = '#';
    homeLink.onclick = (e) => {
        e.preventDefault();
        navigateToFolder('');
    };
    breadcrumb.appendChild(homeLink);

    const separatorSvg = '<span class="separator"><i class="sprite-fm-mono icon-arrow-right"></i></span>';

    parts.forEach((part, index) => {
        const separator = document.createElement('span');
        separator.innerHTML = separatorSvg;
        separator.className = 'inline-block';
        breadcrumb.appendChild(separator);

        const link = document.createElement('a');
        link.textContent = part;
        link.href = '#';
        link.onclick = (e) => {
            e.preventDefault();
            navigateToFolder(parts.slice(0, index + 1).join('/'));
        };
        breadcrumb.appendChild(link);
    });
}

function createFileElement(filename) {
    const isFolder = !filename.includes('.');
    const fileExt = isFolder ? 'folder' : filename.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
    const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExt);
    const isText = ['txt', 'md', 'py', 'js', 'html', 'css', 'json', 'sh'].includes(fileExt);

    const fileElement = document.createElement('div');
    fileElement.className = 'bg-white rounded shadow flex flex-col h-full';

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'flex-grow p-4 flex items-center justify-center';

    if (isImage) {
        const img = document.createElement('img');
        img.src = `/private/${filename}?t=${localStorage.getItem("token")}&folder=${currentFolder}`;
        img.className = 'w-full h-40 object-cover';
        contentWrapper.appendChild(img);
    } else if (isVideo) {
        const video = document.createElement('video');
        video.src = `/private/${filename}?t=${localStorage.getItem("token")}&folder=${currentFolder}`;
        video.className = 'w-full h-40 object-cover';
        video.controls = true;
        contentWrapper.appendChild(video);
    } else if (isText) {
        const previewElement = document.createElement('div');
        previewElement.className = 'text-preview w-full h-full overflow-auto bg-gray-100 p-2 rounded';
        previewElement.textContent = 'Loading preview...';
        contentWrapper.appendChild(previewElement);
        loadTextPreview(filename, previewElement);
    } else if (isFolder) {
        const iconElement = document.createElement('div');
        iconElement.className = 'file-icon w-full h-full flex items-center justify-center cursor-pointer';
        iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M146.67-160q-27 0-46.84-20.17Q80-200.33 80-226.67v-506.66q0-26.34 19.83-46.5Q119.67-800 146.67-800H414l66.67 66.67h332.66q26.34 0 46.5 20.16Q880-693 880-666.67v440q0 26.34-20.17 46.5Q839.67-160 813.33-160H146.67Zm0-66.67h666.66v-440H453l-66.67-66.66H146.67v506.66Zm0 0v-506.66V-226.67Z"/></svg>';
        iconElement.ondblclick = () => navigateToFolder(currentFolder ? `${currentFolder}/${filename}` : filename);
        contentWrapper.appendChild(iconElement);
    } else {
        const iconElement = document.createElement('div');
        iconElement.className = 'file-icon w-full h-full flex items-center justify-center';
        iconElement.innerHTML = getFileIcon(fileExt);
        contentWrapper.appendChild(iconElement);
    }

    fileElement.appendChild(contentWrapper);

    const bottomContainer = document.createElement('div');
    bottomContainer.className = 'p-2 bg-gray-100';

    const nameElement = document.createElement('p');
    nameElement.textContent = filename;
    nameElement.className = 'font-semibold text-center mb-2 truncate';
    bottomContainer.appendChild(nameElement);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-center items-center space-x-2';

    const publicLinkButton = document.createElement('button');
    publicLinkButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffff"><path d="M226.67-40q-27 0-46.84-19.83Q160-79.67 160-106.67v-486q0-27 19.83-46.83 19.84-19.83 46.84-19.83h152.66v66.66H226.67v486h506.66v-486h-154v-66.66h154q27 0 46.84 19.83Q800-619.67 800-592.67v486q0 27-19.83 46.84Q760.33-40 733.33-40H226.67ZM446-338v-453.67l-80 80-47.33-47.66L479.33-920 640-759.33l-47.33 47.66-80-80V-338H446Z"/></svg>';
    publicLinkButton.className = 'bg-green-500 text-white p-2 rounded text-sm';
    publicLinkButton.onclick = () => getPublicLink(filename);
    buttonContainer.appendChild(publicLinkButton);

    const previewButton = document.createElement('button');
    previewButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffff"><path d="M186.67-120q-27.5 0-47.09-19.58Q120-159.17 120-186.67v-586.66q0-27.5 19.58-47.09Q159.17-840 186.67-840h586.66q27.5 0 47.09 19.58Q840-800.83 840-773.33v586.66q0 27.5-19.58 47.09Q800.83-120 773.33-120H186.67Zm0-66.67h586.66v-506.66H186.67v506.66Zm293.36-96.66q-80.7 0-144.2-43.6-63.5-43.61-92.5-113.17 29-69.57 92.48-113.07 63.47-43.5 144.16-43.5 80.7 0 144.2 43.6 63.5 43.61 92.5 113.17-29 69.57-92.48 113.07-63.47 43.5-144.16 43.5Zm-.03-53.34q56.67 0 103.97-27.38T658-440q-26.73-48.57-74.03-75.95-47.3-27.38-103.97-27.38t-103.97 27.38Q328.73-488.57 302-440q26.73 48.57 74.03 75.95 47.3 27.38 103.97 27.38ZM480-440Zm.08 53.33q22.25 0 37.75-15.58 15.5-15.57 15.5-37.83 0-22.25-15.58-37.75-15.57-15.5-37.83-15.5-22.25 0-37.75 15.58-15.5 15.57-15.5 37.83 0 22.25 15.58 37.75 15.57 15.5 37.83 15.5Z"/></svg>';
    previewButton.className = 'bg-blue-500 text-white p-2 rounded text-sm';
    previewButton.onclick = () => previewFile(filename);
    buttonContainer.appendChild(previewButton);

    const renameButton = document.createElement('button');
    renameButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffffff"><path d="M186.67-186.67H235L680-631l-48.33-48.33-445 444.33v48.33ZM120-120v-142l559.33-558.33q9.34-9 21.5-14 12.17-5 25.5-5 12.67 0 25 5 12.34 5 22 14.33L821-772q10 9.67 14.5 22t4.5 24.67q0 12.66-4.83 25.16-4.84 12.5-14.17 21.84L262-120H120Zm652.67-606-46-46 46 46Zm-117 71-24-24.33L680-631l-24.33-24Z"/></svg>'
    renameButton.className = 'bg-purple-500 text-white p-2 rounded text-sm'
    renameButton.onclick = () => renameFile(filename);
    buttonContainer.appendChild(renameButton)

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffff"><path d="M267.33-120q-27.5 0-47.08-19.58-19.58-19.59-19.58-47.09V-740H160v-66.67h192V-840h256v33.33h192V-740h-40.67v553.33q0 27-19.83 46.84Q719.67-120 692.67-120H267.33Zm425.34-620H267.33v553.33h425.34V-740Zm-328 469.33h66.66v-386h-66.66v386Zm164 0h66.66v-386h-66.66v386ZM267.33-740v553.33V-740Z"/></svg>';
    deleteButton.className = 'bg-red-500 text-white p-2 rounded text-sm';
    deleteButton.onclick = () => deleteFile(filename);
    buttonContainer.appendChild(deleteButton);

    bottomContainer.appendChild(buttonContainer);
    fileElement.appendChild(bottomContainer);

    return fileElement;
}

async function createFolder() {
    showModal('Create Folder', 'Enter folder name', async (folderName) => {
        try {
            await fetchData(`/api/create_folder?folder_name=${encodeURIComponent(folderName)}&folder=${currentFolder}`, 'POST');
            showPopup(`Folder ${folderName} created successfully`, 'success');
            loadFiles(currentFolder);
        } catch (error) {
            showPopup('Failed to create folder: ' + error.message, 'error');
        }
    });
}

async function renameFile(oldName) {
    showModal('Rename File', `Enter new name for ${oldName}`, async (newName) => {
        try {
            await fetchData(`/api/rename/${encodeURIComponent(oldName)}?new_name=${encodeURIComponent(newName)}&folder=${currentFolder}`, 'PUT');
            showPopup(`File renamed to ${newName} successfully`, 'success');
            loadFiles(currentFolder);
        } catch (error) {
            showPopup('Failed to rename file: ' + error.message, 'error');
        }
    });
}

async function loadTextPreview(filename, previewElement) {
    try {
        const response = await fetchData(`/api/preview/${filename}`);
        const previewLines = response.preview;
        previewElement.innerHTML = '';
        previewLines.forEach((line, index) => {
            const lineElement = document.createElement('div');
            lineElement.textContent = line.trim();
            if (index >= 10) {
                lineElement.className = 'text-gray-400';
            }
            previewElement.appendChild(lineElement);
        });
    } catch (error) {
        console.log(error);
        previewElement.textContent = 'Preview not available';
    }
}

async function getPublicLink(filename) {
    try {
        const data = await fetchData(`/api/generate-temp-token/${filename}?folder=${currentFolder}`, 'POST');
        const publicUrl = `${window.location.origin}/public/${filename}?t=${data.temp_token}&folder=${currentFolder}`;

        const shortUrlData = await fetchData(`/api/make_short?url=${encodeURIComponent(publicUrl)}`, 'GET');
        const shortUrl = `${window.location.origin}${shortUrlData.short_url}`;
        navigator.clipboard.writeText(shortUrl);
        showPopup(`Short URL:${shortUrl} was copied to the clipboard.`, 'info');
    } catch (error) {
        showPopup('Failed to generate public link: ' + error.message, 'error');
    }
}

async function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
        try {
            await fetchData(`/api/files/${filename}?folder=${currentFolder}`, 'DELETE');
            showPopup('File deleted successfully', 'success');
            loadFiles(currentFolder);
        } catch (error) {
            showPopup('File deletion failed: ' + error.message, 'error');
        }
    }
}

async function previewFile(filename) {
    const previewUrl = `/private/${filename}?t=${localStorage.getItem("token")}&folder=${currentFolder}`;
    window.open(previewUrl, '_blank');
}

function getFileIcon(fileExt) {
    const iconMap = {
        'pdf': '<i class="fas fa-file-pdf"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M331-431h37v-83h48q15.73 0 26.36-10.64Q453-535.28 453-551v-48q0-15.72-10.64-26.36Q431.73-636 416-636h-85v205Zm37-120v-48h48v48h-48Zm129 120h84q15 0 26-10.64 11-10.63 11-26.36v-131q0-15.72-11-26.36Q596-636 581-636h-84v205Zm37-37v-131h47v131h-47Zm133 37h37v-83h50v-37h-50v-48h50v-37h-87v205ZM260-200q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h560q24 0 42 18t18 42v560q0 24-18 42t-42 18H260Zm0-60h560v-560H260v560ZM140-80q-24 0-42-18t-18-42v-620h60v620h620v60H140Zm120-740v560-560Z"/></svg></i>',
        'doc': '<i class="fas fa-file-word"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M319-250h322v-60H319v60Zm0-170h322v-60H319v60ZM220-80q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h361l219 219v521q0 24-18 42t-42 18H220Zm331-554v-186H220v680h520v-494H551ZM220-820v186-186 680-680Z"/></svg></i>',
        'docx': '<i class="fas fa-file-word"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M319-250h322v-60H319v60Zm0-170h322v-60H319v60ZM220-80q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h361l219 219v521q0 24-18 42t-42 18H220Zm331-554v-186H220v680h520v-494H551ZM220-820v186-186 680-680Z"/></svg></i>',
        'xls': '<i class="fas fa-file-excel"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M221-357h127v-50H238v-146h110v-50H221q-14.02 0-23.51 9.78Q188-583.45 188-569v179q0 14.02 9.49 23.51Q206.98-357 221-357Zm166 0h137q14.03 0 23.51-9.49Q557-375.98 557-390v-78q0-13-9.49-22-9.48-9-23.51-9h-87v-54h120v-50H420q-14.02 0-23.51 9.49Q387-584.03 387-570v78q0 14 9.49 23.5T420-459h87v52H387v50Zm271 0h57l75-246h-50l-53 183-47-183h-50l68 246ZM140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-520H140v520Zm0 0v-520 520Z"/></svg></i>',
        'xlsx': '<i class="fas fa-file-excel"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M221-357h127v-50H238v-146h110v-50H221q-14.02 0-23.51 9.78Q188-583.45 188-569v179q0 14.02 9.49 23.51Q206.98-357 221-357Zm166 0h137q14.03 0 23.51-9.49Q557-375.98 557-390v-78q0-13-9.49-22-9.48-9-23.51-9h-87v-54h120v-50H420q-14.02 0-23.51 9.49Q387-584.03 387-570v78q0 14 9.49 23.5T420-459h87v52H387v50Zm271 0h57l75-246h-50l-53 183-47-183h-50l68 246ZM140-160q-24 0-42-18t-18-42v-520q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H140Zm0-60h680v-520H140v520Zm0 0v-520 520Z"/></svg></i>',
        'ppt': '<i class="fas fa-file-powerpoint"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M860-131v-649H100v320H40v-320q0-25 17.63-42.5Q75.25-840 100-840h760q24.75 0 42.38 17.62Q920-804.75 920-780v580q0 26-17 45.5T860-131ZM360-401q-66 0-108-42t-42-108q0-66 42-108t108-42q66 0 108 42t42 108q0 66-42 108t-108 42Zm0-60q39 0 64.5-25.5T450-551q0-39-25.5-64.5T360-641q-39 0-64.5 25.5T270-551q0 39 25.5 64.5T360-461ZM40-80v-94q0-38 19-65t49-41q67-30 128.5-45T360-340q62 0 123 15.5t127.92 44.69q31.3 14.13 50.19 40.97Q680-212 680-174v94H40Zm60-60h520v-34q0-16-9.5-30.5T587-226q-64-31-117-42.5T360-280q-57 0-111 11.5T132-226q-14 7-23 21.5t-9 30.5v34Zm260-411Zm0 411Z"/></svg></i>',
        'pptx': '<i class="fas fa-file-powerpoint"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M860-131v-649H100v320H40v-320q0-25 17.63-42.5Q75.25-840 100-840h760q24.75 0 42.38 17.62Q920-804.75 920-780v580q0 26-17 45.5T860-131ZM360-401q-66 0-108-42t-42-108q0-66 42-108t108-42q66 0 108 42t42 108q0 66-42 108t-108 42Zm0-60q39 0 64.5-25.5T450-551q0-39-25.5-64.5T360-641q-39 0-64.5 25.5T270-551q0 39 25.5 64.5T360-461ZM40-80v-94q0-38 19-65t49-41q67-30 128.5-45T360-340q62 0 123 15.5t127.92 44.69q31.3 14.13 50.19 40.97Q680-212 680-174v94H40Zm60-60h520v-34q0-16-9.5-30.5T587-226q-64-31-117-42.5T360-280q-57 0-111 11.5T132-226q-14 7-23 21.5t-9 30.5v34Zm260-411Zm0 411Z"/></svg></i>',
        'zip': '<i class="fas fa-file-archive"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M640-496v-92h92v92h-92Zm0 92h-92v-92h92v92Zm0 92v-92h92v92h-92ZM456-680l-60-60H140v520h408v-92h92v92h180v-460H640v92h-92v-92h-92ZM140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h281l60 60h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Zm0-60v-520 520Z"/></svg></i>',
        'rar': '<i class="fas fa-file-archive"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M640-496v-92h92v92h-92Zm0 92h-92v-92h92v92Zm0 92v-92h92v92h-92ZM456-680l-60-60H140v520h408v-92h92v92h180v-460H640v92h-92v-92h-92ZM140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h281l60 60h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Zm0-60v-520 520Z"/></svg></i>',
        'exe': '<i class="fas fa-windows"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M334-120v-60h86v-100H140q-24 0-42-18t-18-42v-440q0-24 18-42t42-18h680q24 0 42 18t18 42v440q0 24-18 42t-42 18H540v100h86v60H334ZM140-340h680v-440H140v440Zm0 0v-440 440Z"/></svg></i>',
        'mp3': '<i class="fas fa-file-music"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M393-120q-63 0-106.5-43.5T243-270q0-63 43.5-106.5T393-420q28 0 50.5 8t39.5 22v-450h234v135H543v435q0 63-43.5 106.5T393-120Z"/></svg></i>',
        'aac': '<i class="fas fa-file-music"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M393-120q-63 0-106.5-43.5T243-270q0-63 43.5-106.5T393-420q28 0 50.5 8t39.5 22v-450h234v135H543v435q0 63-43.5 106.5T393-120Z"/></svg></i>',
    };

    return iconMap[fileExt] || '<i class="fas fa-file"><svg xmlns="http://www.w3.org/2000/svg" height="100px" viewBox="0 -960 960 960" width="100px" fill="#3498db"><path d="M180-820v295-4 389-680 186-186Zm99 400h168q12-17 26.5-32t31.5-28H279v60Zm0 170h123q-2-15-1.5-30t2.5-30H279v60ZM180-80q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h361l219 219v155q-14-7-29-11.5t-31-7.5v-109H511v-186H180v680h260q11 17 24 32t28 28H180Zm475-389q80.51 0 137.26 56.74Q849-355.51 849-275q0 80.51-56.74 137.26Q735.51-81 655-81q-80.51 0-137.26-56.74Q461-194.49 461-275q0-80.51 56.74-137.26Q574.49-469 655-469Zm1.11 318q11.89 0 19.89-8.11t8-20q0-11.89-8.11-19.89t-20-8Q644-207 636-198.89t-8 20q0 11.89 8.11 19.89t20 8ZM636-233h40v-10.95q0-12.05 6.5-22.05t15.23-18.4Q713-297 722.5-309.5 732-322 732-342q0-31.72-21.3-50.86Q689.41-412 655.78-412 630-412 609-397.5t-29 39.99L616-342q2-14 13.5-23.5t26.95-9.5q16.55 0 26.05 8.25T692-342q0 11-7 19.5T670-306q-8 7-15.5 14T642-277q-4 7-5 13.3-1 6.3-1 14.7v16Z"/></svg></i>';
}


function showPopup(message, type = 'info') {
    const popupContainer = document.getElementById('popupContainer');
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.textContent = message;
    popupContainer.appendChild(popup);
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
        }, 300);
    }, 3000);
}

function showFullImage(event) {
    const fullImage = event.currentTarget.querySelector('.full-image');
    fullImage.style.display = 'block';

    document.addEventListener('mousemove', moveFullImage);

    function moveFullImage(e) {
        const x = e.clientX;
        const y = e.clientY;
        fullImage.style.left = `${x + 20}px`;
        fullImage.style.top = `${y + 20}px`;
    }
}

function hideFullImage(event) {
    const fullImage = event.currentTarget.querySelector('.full-image');
    fullImage.style.display = 'none';
    document.removeEventListener('mousemove', moveFullImage);
}

let currentFolder = '';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const payload = { username, password };
            try {
                const data = await fetchData('/api/login', 'POST', JSON.stringify(payload));
                localStorage.setItem('token', data.token);
                window.location.href = '/dashboard';
            } catch (error) {
                showPopup('Login failed: ' + error.message, 'error');
            }
        });
    }

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('uploadFileList');
    const uploadForm = document.getElementById('uploadForm');

    let filesToUpload = new Map();

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    const createFolderBtn = document.getElementById('createFolderBtn');
    if (createFolderBtn) {
        createFolderBtn.addEventListener('click', createFolder);
    }

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            const fileId = Date.now() + Math.random().toString(36).substr(2, 9);
            filesToUpload.set(fileId, file);

            const listItem = document.createElement('li');
            listItem.className = 'flex items-center justify-between bg-white p-2 rounded mb-2';
            listItem.innerHTML = `
                <span>${file.name}</span>
                <button class="text-red-500" data-file-id="${fileId}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="m251.33-204.67-46.66-46.66L433.33-480 204.67-708.67l46.66-46.66L480-526.67l228.67-228.66 46.66 46.66L526.67-480l228.66 228.67-46.66 46.66L480-433.33 251.33-204.67Z"/></svg></button>
            `;
            listItem.querySelector('button').addEventListener('click', function() {
                filesToUpload.delete(this.dataset.fileId);
                this.parentElement.remove();
            });
            fileList.appendChild(listItem);
        });
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (filesToUpload.size === 0) {
            showPopup('No files selected', 'error');
            return;
        }

        for (const [fileId, file] of filesToUpload) {
            const formData = new FormData();
            formData.append('file', file);
            showPopup(`Uploading ${file.name}, please wait...`, 'info');
            try {
                await fetchData(`/api/upload?folder=${currentFolder}`, 'POST', formData);
                showPopup(`${file.name} uploaded successfully`, 'success');
            } catch (error) {
                showPopup(`${file.name} upload failed: ${error.message}`, 'error');
            }
        }

        fileList.innerHTML = '';
        fileInput.value = '';
        filesToUpload.clear();
        loadFiles(currentFolder);
    });
    loadFiles(currentFolder);

});