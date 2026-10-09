import random, struct, json, sys
from decimal import Decimal, getcontext
getcontext().prec = 60
random.seed(1)
xs = [random.uniform(-700, 700) for _ in range(20000)] + [random.uniform(-1, 1) for _ in range(20000)] + [random.uniform(-1e-6, 1e-6) for _ in range(5000)]
out = [[x, float(Decimal(x).exp())] for x in xs]
json.dump(out, sys.stdout)
