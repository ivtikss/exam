from flask import Flask, render_template
import random
from questions import questions

app = Flask(__name__)

@app.route('/')
def index():
    # Вопрос 1: Автоматизированные транспортные + Конструирование элементов
    group1 = [
        'Автоматизированные транспортные и накопительные системы',
        'Конструирование элементов гибких производственных систем'
    ]
    q1_discipline = random.choice(group1)
    q1 = random.choice(questions[q1_discipline])
    q1_number = q1.split('. ')[0]
    q1_text = q1[len(q1_number) + 2:]

    # Вопрос 2: Наладка и программирование ЧПУ
    group2 = [
        'Наладка станков с числовым программным управлением',
        'Программирование станков с числовым программным управлением'
    ]
    q2_discipline = random.choice(group2)
    q2 = random.choice(questions[q2_discipline])
    q2_number = q2.split('. ')[0]
    q2_text = q2[len(q2_number) + 2:]

    # Вопрос 3: Программирование роботов и ПЛК
    group3 = [
        'Программирование промышленных роботов',
        'Программирование промышленных контроллеров'
    ]
    q3_discipline = random.choice(group3)
    q3 = random.choice(questions[q3_discipline])
    q3_number = q3.split('. ')[0]
    q3_text = q3[len(q3_number) + 2:]

    return render_template('index.html',
                           q1_number=q1_number, q1_text=q1_text, q1_discipline=q1_discipline,
                           q2_number=q2_number, q2_text=q2_text, q2_discipline=q2_discipline,
                           q3_number=q3_number, q3_text=q3_text, q3_discipline=q3_discipline)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
