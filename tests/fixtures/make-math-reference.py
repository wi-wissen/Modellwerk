# Reference values for ln and pow: Python decimal with 60 digits, rounded to double.
import json, random, sys
from decimal import Decimal, getcontext
getcontext().prec = 60
random.seed(2)
ln = []
for _ in range(3000):
    x = random.choice([random.uniform(0, 2), random.uniform(0, 1e6), 10 ** random.uniform(-300, 300)])
    if x > 0: ln.append([x, float(Decimal(x).ln())])
pw = []
for _ in range(3000):
    x = random.uniform(0.01, 100)
    y = random.choice([random.uniform(-5, 5), float(random.randint(-12, 12)), round(random.uniform(0, 4), 1)])
    v = Decimal(x) ** Decimal(y)
    if abs(v) < Decimal('1e300'): pw.append([x, y, float(v)])
json.dump({'ln': ln, 'pow': pw}, sys.stdout)
