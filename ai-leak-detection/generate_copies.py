names = ['Ramesh', 'Suresh', 'Mahesh']
centers = ['Center_Kanpur', 'Center_Lucknow', 'Center_Delhi']
ref_codes = ['KNP7', 'LKO7', 'DEL7']

with open('master_paper.txt', 'r') as f:
    master_text = f.read()

for i in range(3):
    copy_text = master_text.replace('Ramesh', names[i])
    copy_text = copy_text + f'\n\nRef: {ref_codes[i]}'
    filename = f'copy_{i+1}.txt'
    with open(filename, 'w') as f:
        f.write(copy_text)
    print(f'{filename} created for {centers[i]} with ref code {ref_codes[i]}')