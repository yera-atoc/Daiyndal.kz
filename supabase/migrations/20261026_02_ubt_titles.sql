-- «ҰБТ пробный» → «ҰБТ сынағы» (тест атаулары қазақша)
update ielts_tests set title = replace(title, 'ҰБТ пробный', 'ҰБТ сынағы') where exam = 'ubt' and title like '%ҰБТ пробный%';
