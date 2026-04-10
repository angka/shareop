// ShareOp Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    const tanggalInput = document.getElementById('tanggal');
    const kamarsContainer = document.getElementById('kamarsContainer');
    const tambahKamarBtn = document.getElementById('tambahKamarBtn');
    const simpanBtn = document.getElementById('simpanBtn');
    const previewBtn = document.getElementById('previewBtn');
    const kirimTelegramBtn = document.getElementById('kirimTelegramBtn');
    const previewModal = document.getElementById('previewModal');
    const previewText = document.getElementById('previewText');
    const closePreviewBtn = document.getElementById('closePreviewBtn');

    let currentDate = '';

    // Initialize today's date
    const today = new Date().toISOString().split('T')[0];
    tanggalInput.value = today;
    loadJadwal(today);

    // Event listeners
    tanggalInput.addEventListener('change', (e) => {
        const tanggal = e.target.value;
        loadJadwal(tanggal);
    });

    tambahKamarBtn.addEventListener('click', () => {
        addKamarTable();
    });

    simpanBtn.addEventListener('click', () => {
        saveJadwal();
    });

    previewBtn.addEventListener('click', () => {
        generatePreview();
    });

    kirimTelegramBtn.addEventListener('click', () => {
        kirimKeTelegram();
    });

    closePreviewBtn.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    // Load jadwal for a specific date
    async function loadJadwal(tanggal) {
        currentDate = tanggal;
        try {
            const response = await fetch(`/api/jadwal/${tanggal}`);
            const kamarData = await response.json();

            // Clear existing kamars
            kamarsContainer.innerHTML = '';

            // Add kamar tables
            kamarData.forEach(kamar => {
                createKamarTable(kamar);
            });

            // If no data, show empty state
            if (kamarData.length === 0) {
                kamarsContainer.innerHTML = '<p>Belum ada data untuk tanggal ini. Tambahkan kamar operasi.</p>';
            }
        } catch (error) {
            console.error('Error loading jadwal:', error);
            kamarsContainer.innerHTML = '<p>Error loading data. Please try again.</p>';
        }
    }

    // Create a kamar table
    function createKamarTable(kamarData) {
        const kamarDiv = document.createElement('div');
        kamarDiv.className = 'kamar';

        const header = document.createElement('div');
        header.className = 'kamar-header';

        const title = document.createElement('h2');
        title.textContent = kamarData.nama_kamar || 'Kamar Operasi';
        title.contentEditable = 'true';
        title.addEventListener('blur', () => {
            kamarData.nama_kamar = title.textContent;
        });

        const actions = document.createElement('div');
        actions.className = 'kamar-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = 'Hapus Kamar';
        deleteBtn.onclick = () => {
            if (confirm('Apakah Anda yakin ingin menghapus kamar ini?')) {
                kamarDiv.remove();
            }
        };

        actions.appendChild(deleteBtn);
        header.appendChild(title);
        header.appendChild(actions);
        kamarDiv.appendChild(header);

        // Create table
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>No</th>
                    <th>Jam</th>
                    <th>Status Pasien</th>
                    <th>Nama</th>
                    <th>JK</th>
                    <th>Umur</th>
                    <th>Sat.</th>
                    <th>RM</th>
                    <th>Diagnosis</th>
                    <th>Plan</th>
                    <th>DPJP</th>
                    <th>Pendamping</th>
                    <th>Operator</th>
                    <th>Asisten</th>
                    <th>Onloop</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Add entries
        kamarData.entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="no">${index + 1}</td>
                <td><input type="time" value="${entry.jam || ''}"></td>
                <td>
                    <select>
                        <option value="">Rawat Inap</option>
                        <option value="ODC">ODC</option>
                        <option value="FT1">FT1</option>
                        <option value="FT2">FT2</option>
                    </select>
                </td>
                <td><input type="text" placeholder="Nama"></td>
                <td>
                    <select>
                        <option value="L">L</option>
                        <option value="P">P</option>
                    </select>
                </td>
                <td><input type="number" min="0" placeholder="Umur"></td>
                <td>
                    <select>
                        <option value="thn">thn</option>
                        <option value="bln">bln</option>
                    </select>
                </td>
                <td><input type="text" placeholder="No. RM"></td>
                <td><input type="text" placeholder="Diagnosis"></td>
                <td><input type="text" placeholder="Plan"></td>
                <td><input type="text" placeholder="DPJP"></td>
                <td><input type="text" placeholder="Pendamping"></td>
                <td><input type="text" placeholder="Operator"></td>
                <td><input type="text" placeholder="Asisten"></td>
                <td><input type="text" placeholder="Onloop"></td>
                <td class="action-col">
                    <button class="action-btn up">▲</button>
                    <button class="action-btn down">▼</button>
                    <button class="action-btn delete">🗑</button>
                </td>
            `;

            // Set values if entry exists
            if (entry) {
                const inputs = row.querySelectorAll('input, select');
                inputs[0].value = entry.jam || ''; // Jam
                inputs[1].value = entry.status_pasien || ''; // Status Pasien
                inputs[2].value = entry.nama || ''; // Nama
                inputs[3].value = entry.jenis_kelamin || 'L'; // JK
                inputs[4].value = entry.umur || ''; // Umur
                inputs[5].value = entry.satuan_umur || 'thn'; // Satuan Umur
                inputs[6].value = entry.no_rm || ''; // No. RM
                inputs[7].value = entry.diagnosis || ''; // Diagnosis
                inputs[8].value = entry.plan || ''; // Plan
                inputs[9].value = entry.dpjp || ''; // DPJP
                inputs[10].value = entry.pendamping || ''; // Pendamping
                inputs[11].value = entry.operator || ''; // Operator
                inputs[12].value = entry.asisten || ''; // Asisten
                inputs[13].value = entry.onloop || ''; // Onloop
            }

            // Add event listeners for action buttons
            const upBtn = row.querySelector('.action-btn.up');
            const downBtn = row.querySelector('.action-btn.down');
            const deleteRowBtn = row.querySelector('.action-btn.delete');

            upBtn.onclick = () => {
                if (row.previousElementSibling && row.previousElementSibling.tagName === 'TR') {
                    tbody.insertBefore(row, row.previousElementSibling);
                    updateRowNumbers(tbody);
                }
            };

            downBtn.onclick = () => {
                if (row.nextElementSibling && row.nextElementSibling.tagName === 'TR') {
                    tbody.insertBefore(row.nextElementSibling, row);
                    updateRowNumbers(tbody);
                }
            };

            deleteRowBtn.onclick = () => {
                row.remove();
                updateRowNumbers(tbody);
            };

            // Add inline edit listeners
            const inputs = row.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    // Update row number if needed
                    updateRowNumbers(tbody);
                });
            });

            const selects = row.querySelectorAll('select');
            selects.forEach(select => {
                select.addEventListener('change', () => {
                    // Update row number if needed
                    updateRowNumbers(tbody);
                });
            });

            tbody.appendChild(row);
        });

        // Add "+ Baris" button
        const tfoot = document.createElement('tfoot');
        tfoot.innerHTML = `
            <tr>
                <td colspan="16" style="text-align: center;">
                    <button type="button" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        + Baris
                    </button>
                </td>
            </tr>
        `;

        tfoot.querySelector('button').onclick = () => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td class="no"></td>
                <td><input type="time"></td>
                <td>
                    <select>
                        <option value="">Rawat Inap</option>
                        <option value="ODC">ODC</option>
                        <option value="FT1">FT1</option>
                        <option value="FT2">FT2</option>
                    </select>
                </td>
                <td><input type="text" placeholder="Nama"></td>
                <td>
                    <select>
                        <option value="L">L</option>
                        <option value="P">P</option>
                    </select>
                </td>
                <td><input type="number" min="0" placeholder="Umur"></td>
                <td>
                    <select>
                        <option value="thn">thn</option>
                        <option value="bln">bln</option>
                    </select>
                </td>
                <td><input type="text" placeholder="No. RM"></td>
                <td><input type="text" placeholder="Diagnosis"></td>
                <td><input type="text" placeholder="Plan"></td>
                <td><input type="text" placeholder="DPJP"></td>
                <td><input type="text" placeholder="Pendamping"></td>
                <td><input type="text" placeholder="Operator"></td>
                <td><input type="text" placeholder="Asisten"></td>
                <td><input type="text" placeholder="Onloop"></td>
                <td class="action-col">
                    <button class="action-btn up">▲</button>
                    <button class="action-btn down">▼</button>
                    <button class="action-btn delete">🗑</button>
                </td>
            `;

            // Add event listeners for new row
            const upBtn = newRow.querySelector('.action-btn.up');
            const downBtn = newRow.querySelector('.action-btn.down');
            const deleteRowBtn = newRow.querySelector('.action-btn.delete');

            upBtn.onclick = () => {
                if (newRow.previousElementSibling && newRow.previousElementSibling.tagName === 'TR') {
                    tbody.insertBefore(newRow, newRow.previousElementSibling);
                    updateRowNumbers(tbody);
                }
            };

            downBtn.onclick = () => {
                if (newRow.nextElementSibling && newRow.nextElementSibling.tagName === 'TR') {
                    tbody.insertBefore(newRow.nextElementSibling, newRow);
                    updateRowNumbers(tbody);
                }
            };

            deleteRowBtn.onclick = () => {
                newRow.remove();
                updateRowNumbers(tbody);
            };

            // Add inline edit listeners
            const inputs = newRow.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    updateRowNumbers(tbody);
                });
            });

            const selects = newRow.querySelectorAll('select');
            selects.forEach(select => {
                select.addEventListener('change', () => {
                    updateRowNumbers(tbody);
                });
            });

            tbody.appendChild(newRow);
            updateRowNumbers(tbody);
        };

        table.appendChild(tfoot);
        kamarDiv.appendChild(table);
        kamarsContainer.appendChild(kamarDiv);
    }

    // Add empty kamar table
    function addKamarTable() {
        createKamarTable({
            nama_kamar: '',
            entries: []
        });
    }

    // Update row numbers in tbody
    function updateRowNumbers(tbody) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const noCell = row.querySelector('.no');
            if (noCell) {
                noCell.textContent = index + 1;
            }
        });
    }

    // Save jadwal data
    async function saveJadwal() {
        const kamarData = [];

        // Get all kamar elements
        const kamarElements = document.querySelectorAll('.kamar');

        kamarElements.forEach(kamarElement => {
            const namaKamar = kamarElement.querySelector('.kamar-header h2').textContent;

            const table = kamarElement.querySelector('table');
            const tbody = table.querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');

            const entries = [];

            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const selects = row.querySelectorAll('select');

                const entry = {
                    jam: inputs[0].value,
                    status_pasien: selects[0].value,
                    nama: inputs[1].value,
                    jenis_kelamin: selects[1].value,
                    umur: inputs[2].value,
                    satuan_umur: selects[2].value,
                    no_rm: inputs[3].value,
                    diagnosis: inputs[4].value,
                    plan: inputs[5].value,
                    dpjp: inputs[6].value,
                    pendamping: inputs[7].value,
                    operator: inputs[8].value,
                    asisten: inputs[9].value,
                    onloop: inputs[10].value
                };

                // Only add entry if it has at least a name
                if (entry.nama.trim() !== '') {
                    entries.push(entry);
                }
            });

            kamarData.push({
                nama_kamar: namaKamar,
                entries: entries
            });
        });

        try {
            const response = await fetch('/api/jadwal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tanggal: currentDate,
                    kamarData: kamarData
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('Jadwal berhasil disimpan!');
            } else {
                throw new Error('Gagal menyimpan jadwal');
            }
        } catch (error) {
            console.error('Error saving jadwal:', error);
            alert('Gagal menyimpan jadwal. Silakan coba lagi.');
        }
    }

    // Generate preview
    async function generatePreview() {
        try {
            const response = await fetch(`/api/preview/${currentDate}`);
            const result = await response.json();

            previewText.textContent = result.message;
            previewModal.style.display = 'block';
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Gagal menghasilkan preview. Silakan coba lagi.');
        }
    }

    // Send to Telegram
    async function kirimKeTelegram() {
        if (!confirm('Apakah Anda yakin ingin mengirim jadwal ini ke grup Telegram?')) {
            return;
        }

        try {
            const response = await fetch(`/api/kirim-telegram/${currentDate}`, {
                method: 'POST'
            });

            const result = await response.json();
            if (result.success) {
                alert('Pesan berhasil dikirim ke Telegram!');
            } else {
                throw new Error('Gagal mengirim pesan');
            }
        } catch (error) {
            console.error('Error sending to Telegram:', error);
            alert('Gagal mengirim pesan ke Telegram. Silakan coba lagi.');
        }
    }
});