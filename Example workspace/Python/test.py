# Python program to find the largest number among the three input numbers

num1 = float(input("Enter first number: "))
num2 = float(input("Enter second number: "))
num3 = float(input("Enter third number: "))

if (num1 >= num2) and (num1 >= num3):
   largest = num1
   '''
   $parson{
      "text": "num1",
      "width": 10,
      "type": "dropdownDef",
      "dropdown": "num",
      "options": [
         "num2",
         "num3"
      ]
   }
   '''
elif (num2 >= num1) and (num2 >= num3):
   largest = num2
   '''
   $parson{
      "text": "num2",
      "width": 10,
      "type": "dropdown",
      "dropdown": "num"
   }
   '''
else:
   largest = num3
   '''
   $parson{
      "text": "num3",
      "width": 10,
      "type": "dropdown",
      "dropdown": "num"
   }
   '''

print("The largest number is", largest)